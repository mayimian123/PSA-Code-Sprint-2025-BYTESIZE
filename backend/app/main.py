from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware

from .clients import OpenAIClient
from .config import get_settings
from .models import (
    CareerNavigatorRequest,
    CareerNavigatorResponse,
    ChatbotRequest,
    ChatbotResponse,
    CommunityBoardResponse,
    CommunityPolishRequest,
    CommunityPolishResponse,
    CommunityPost,
    CourseSummary,
    EmployeeProfileRecord,
    LearningHubRequest,
    LearningHubResponse,
    LearningCoursesResponse,
    JobSummary,
    JobsResponse,
    RecommendedQuestionsResponse,
    WellnessEvent,
    WellnessEventsResponse,
)
from .services.career_navigator import CareerNavigatorService
from .services.chatbot import ChatHistoryMessage, ChatbotService
from .services.community import CommunityPolishService
from .services.data_repository import DataRepository
from .services.learning_hub import LearningHubService
from .services.rag import RAGService
from .services.recommended_questions import RecommendedQuestionsService


def create_app() -> FastAPI:
    settings = get_settings()
    try:
        client = OpenAIClient(settings)
    except RuntimeError as error:
        raise RuntimeError(
            f"Failed to initialise OpenAI client: {error}"
        ) from error

    data_repository = DataRepository(settings.data_dir)
    rag_service = RAGService(
        client=client,
        source_path=settings.rag_source_path,
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
        top_k=settings.rag_top_k,
    )

    chatbot_service = ChatbotService(client=client, rag_service=rag_service)
    community_service = CommunityPolishService(
        client=client,
        prompt_path=settings.prompt_dir / "Connect@PSA_AIPolish.md",
    )
    career_service = CareerNavigatorService(
        client=client,
        prompt_path=settings.prompt_dir / "Career_Navigator.md",
    )
    learning_service = LearningHubService(
        client=client,
        prompt_path=settings.prompt_dir / "Learning_Hub_course_recommend.md",
    )
    
    recommended_questions_service = RecommendedQuestionsService(
        questions_path=settings.rag_source_path.parent / "recommend_query.md"
    )

    app = FastAPI(title="PSA AI Backend", version="1.0.0")

    # Enable CORS for frontend clients
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 在生产环境中应该设置为具体的前端域名
        allow_credentials=True,
        allow_methods=["*"],  # 允许所有 HTTP 方法
        allow_headers=["*"],  # 允许所有 headers
    )

    @app.post("/api/chatbot", response_model=ChatbotResponse)
    async def chatbot_endpoint(payload: ChatbotRequest) -> ChatbotResponse:
        try:
            history = None
            if payload.history:
                history = [
                    ChatHistoryMessage(role=item.role, content=item.content)
                    for item in payload.history
                ]
            answer, _ = chatbot_service.answer(
                payload.query,
                history=history,
            )
            return ChatbotResponse(answer=answer.strip())
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.post("/api/community/polish", response_model=CommunityPolishResponse)
    async def community_polish_endpoint(
        payload: CommunityPolishRequest,
    ) -> CommunityPolishResponse:
        try:
            polished = community_service.polish(payload.content, payload.tone)
            return CommunityPolishResponse(polished_content=polished.strip())
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.post("/api/career/navigator", response_model=CareerNavigatorResponse)
    async def career_navigator_endpoint(
        payload: CareerNavigatorRequest,
    ) -> CareerNavigatorResponse:
        try:
            fit_percentage, scores, narrative = career_service.analyse(
                payload.job_information, payload.employee_information
            )
            return CareerNavigatorResponse(
                fit_percentage=round(fit_percentage, 2),
                dimension_scores=scores,
                narrative=narrative,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.post("/api/learning/recommendation", response_model=LearningHubResponse)
    async def learning_hub_endpoint(
        payload: LearningHubRequest,
    ) -> LearningHubResponse:
        try:
            recommendation = learning_service.recommend(
                payload.course_information, payload.employee_profile
            )
            return LearningHubResponse(recommendation=recommendation)
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get("/api/chatbot/recommended-questions", response_model=RecommendedQuestionsResponse)
    async def get_recommended_questions() -> RecommendedQuestionsResponse:
        """Get a list of recommended questions for the chatbot."""
        try:
            questions = recommended_questions_service.get_questions()
            return RecommendedQuestionsResponse(questions=questions)
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get(
        "/api/community/{board}",
        response_model=CommunityBoardResponse,
        summary="Get posts for a specific community board.",
    )
    async def community_board_endpoint(board: str) -> CommunityBoardResponse:
        try:
            posts = data_repository.get_community_posts(board)
            if not posts:
                raise HTTPException(
                    status_code=404,
                    detail=f"No posts found for board '{board}'.",
                )
            return CommunityBoardResponse(
                board=board,
                items=[CommunityPost.model_validate(item) for item in posts],
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get(
        "/api/learning/courses",
        response_model=LearningCoursesResponse,
        summary="List learning hub courses.",
    )
    async def learning_courses_endpoint(field: str | None = Query(default=None)) -> LearningCoursesResponse:
        try:
            courses = data_repository.get_courses(field)
            return LearningCoursesResponse(
                courses=[CourseSummary.model_validate(item) for item in courses],
            )
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get(
        "/api/career/jobs",
        response_model=JobsResponse,
        summary="List available internal jobs.",
    )
    async def career_jobs_endpoint() -> JobsResponse:
        try:
            jobs = data_repository.get_jobs()
            return JobsResponse(jobs=[JobSummary.model_validate(item) for item in jobs])
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get(
        "/api/wellness/events",
        response_model=WellnessEventsResponse,
        summary="List wellness events.",
    )
    async def wellness_events_endpoint() -> WellnessEventsResponse:
        try:
            events = data_repository.list_wellness_events()
            return WellnessEventsResponse(
                events=[WellnessEvent.model_validate(item) for item in events],
            )
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get(
        "/api/employees/{employee_id}",
        response_model=EmployeeProfileRecord,
        summary="Retrieve an employee profile.",
    )
    async def employee_profile_endpoint(employee_id: str) -> EmployeeProfileRecord:
        try:
            profile = data_repository.get_employee_profile(employee_id)
            return EmployeeProfileRecord.model_validate(profile)
        except ValueError as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(status_code=500, detail=str(error)) from error

    @app.get("/healthz")
    async def healthcheck() -> dict[str, str]:
        """Render health-check endpoint."""
        return {"status": "ok"}

    return app


app = create_app()
