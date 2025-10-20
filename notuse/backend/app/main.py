from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .llm import LLMClient
from .models import (
    CareerNavigatorRequest,
    CareerNavigatorResponse,
    ChatbotRequest,
    ChatbotResponse,
    ChatbotSource,
    CommunityPostModel,
    CommunityFeedResponse,
    CommunityPolishRequest,
    CommunityPolishResponse,
    CourseModel,
    CourseListResponse,
    EmployeeProfileResponse,
    LearningHubRequest,
    LearningHubResponse,
    RecommendedQuestionsResponse,
    WellnessListResponse,
    WellnessEventModel,
    JobListResponse,
    JobModel,
)
from .repository import DataRepository
from .services.career_navigator import CareerNavigatorService
from .services.chatbot import ChatHistoryMessage, ChatbotService
from .services.community import CommunityPolishService
from .services.learning_hub import LearningHubService
from .services.rag import RAGService
from .services.recommended_questions import RecommendedQuestionsService


def create_app() -> FastAPI:
    settings = get_settings()
    repository = DataRepository(settings.data_dir)
    llm_client = LLMClient(settings)

    rag_service = RAGService(
        llm=llm_client,
        source_path=settings.rag_source_path,
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        top_k=settings.rag_top_k,
    )

    chatbot_service = ChatbotService(llm=llm_client, rag_service=rag_service)
    community_service = CommunityPolishService(
        llm=llm_client,
        prompt_path=settings.prompt_dir / "Connect@PSA_AIPolish.md",
    )
    career_service = CareerNavigatorService(
        llm=llm_client,
        prompt_path=settings.prompt_dir / "Career_Navigator.md",
        repository=repository,
    )
    learning_service = LearningHubService(
        llm=llm_client,
        prompt_path=settings.prompt_dir / "Learning_Hub_course_recommend.md",
        repository=repository,
    )
    recommended_questions_service = RecommendedQuestionsService(
        questions_path=settings.recommended_questions_path
    )

    app = FastAPI(title="PSA Experience Platform", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/api/chatbot", response_model=ChatbotResponse)
    async def chatbot_endpoint(payload: ChatbotRequest) -> ChatbotResponse:
        history = None
        if payload.history:
            history = [ChatHistoryMessage(role=item.role, content=item.content) for item in payload.history]
        answer, chunks = chatbot_service.answer(payload.query, history=history)
        sources = [ChatbotSource(content=chunk.content, similarity=chunk.similarity) for chunk in chunks]
        return ChatbotResponse(answer=answer, sources=sources)

    @app.post("/api/community/polish", response_model=CommunityPolishResponse)
    async def community_polish_endpoint(payload: CommunityPolishRequest) -> CommunityPolishResponse:
        polished = community_service.polish(payload.content, payload.tone)
        return CommunityPolishResponse(polished_content=polished)

    @app.get("/api/community/{board}", response_model=CommunityFeedResponse)
    async def community_feed(board: str) -> CommunityFeedResponse:
        items = repository.list_community_posts(board)
        return CommunityFeedResponse(
            board=board,
            items=[
                CommunityPostModel(
                    title=item.title,
                    description=item.description,
                    time=item.time,
                    posted_by=item.posted_by,
                    board=item.board,
                )
                for item in items
            ],
        )

    @app.post("/api/career/navigator", response_model=CareerNavigatorResponse)
    async def career_navigator_endpoint(payload: CareerNavigatorRequest) -> CareerNavigatorResponse:
        fit_percentage, scores, narrative = career_service.analyse(
            payload.job_information,
            payload.employee_information,
        )
        return CareerNavigatorResponse(
            fit_percentage=round(fit_percentage, 2),
            dimension_scores=scores,
            narrative=narrative,
        )

    @app.get("/api/career/jobs", response_model=JobListResponse)
    async def list_jobs() -> JobListResponse:
        jobs = repository.list_jobs()
        return JobListResponse(
            jobs=[
                JobModel(
                    title=job.title,
                    duties=job.duties,
                    requirements=job.requirements,
                )
                for job in jobs
            ]
        )

    @app.post("/api/learning/recommendation", response_model=LearningHubResponse)
    async def learning_hub_endpoint(payload: LearningHubRequest) -> LearningHubResponse:
        recommendation = learning_service.recommend(
            payload.course_information,
            payload.employee_profile,
        )
        return LearningHubResponse(recommendation=recommendation)

    @app.get("/api/learning/courses", response_model=CourseListResponse)
    async def list_courses(field: str | None = None, search: str | None = None) -> CourseListResponse:
        courses = repository.list_courses(field=field, search=search)
        return CourseListResponse(
            courses=[
                CourseModel(
                    topic=course.topic,
                    name=course.name,
                    description=course.description,
                    field=course.field,
                    what_you_learn=course.what_you_learn,
                    skills=course.skills,
                )
                for course in courses
            ]
        )

    @app.get("/api/chatbot/recommended-questions", response_model=RecommendedQuestionsResponse)
    async def get_recommended_questions() -> RecommendedQuestionsResponse:
        questions = recommended_questions_service.get_questions()
        return RecommendedQuestionsResponse(questions=questions)

    @app.get("/api/wellness/events", response_model=WellnessListResponse)
    async def list_wellness_events() -> WellnessListResponse:
        events = repository.list_wellness_events()
        return WellnessListResponse(
            events=[
                WellnessEventModel(
                    category=event.category,
                    title=event.title,
                    description=event.description,
                    date_time=event.date_time,
                    location=event.location,
                )
                for event in events
            ]
        )

    @app.get("/api/employees/{employee_id}", response_model=EmployeeProfileResponse)
    async def get_employee(employee_id: str) -> EmployeeProfileResponse:
        employee = repository.get_employee(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return EmployeeProfileResponse(**employee)

    return app


app = create_app()
