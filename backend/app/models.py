from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import AliasChoices, BaseModel, Field, ConfigDict, field_validator


def _coerce_str_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        normalised = value.replace(";", ",")
        return [item.strip() for item in normalised.split(",") if item.strip()]
    return [str(value).strip()]


class ChatHistoryMessage(BaseModel):
    """A message in the chat history."""

    role: str
    content: str


class ChatbotSource(BaseModel):
    """A source document used to answer a query."""

    content: str
    similarity: float


class ChatbotRequest(BaseModel):
    """Request payload for the chatbot endpoint."""

    query: str
    history: Optional[List[ChatHistoryMessage]] = None


class ChatbotResponse(BaseModel):
    """Response payload for the chatbot endpoint."""

    answer: str
    sources: List[ChatbotSource] = Field(default_factory=list)


class CommunityPolishRequest(BaseModel):
    """Request payload for the community polish endpoint."""

    content: str
    tone: str = Field(
        default="Professional",
        description="One of: Professional, Friendly, Concise, Humorous",
    )


class CommunityPolishResponse(BaseModel):
    """Response payload for the community polish endpoint."""

    polished_content: str


class JobInformation(BaseModel):
    """Job information for career navigation."""

    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(
        description="Job title",
        validation_alias=AliasChoices("title", "job_title", "name"),
    )
    description: Optional[str] = Field(
        default=None,
        description="Job description",
        validation_alias=AliasChoices("description", "job_description", "summary"),
    )
    requirements: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("requirements", "job_requirements"),
    )


class EmployeeInformation(BaseModel):
    """Employee information for career navigation."""

    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("name", "employee_name"),
    )
    current_role: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("current_role", "job_title", "role"),
    )
    skills: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("skills", "skillset", "capabilities"),
    )
    experience: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("experience", "background", "summary"),
    )
    competencies: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("competencies", "strengths"),
    )
    achievements: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("achievements", "notable_projects"),
    )

    @field_validator("skills", "competencies", "achievements", mode="before")
    @classmethod
    def _ensure_iterable(cls, value: Any) -> List[str]:
        return _coerce_str_list(value)


class CareerNavigatorRequest(BaseModel):
    """Request payload for the career navigator endpoint."""

    job_information: JobInformation
    employee_information: EmployeeInformation


class DimensionScore(BaseModel):
    """Score for a specific career dimension."""

    dimension: str
    score: float
    explanation: str


class CareerNavigatorResponse(BaseModel):
    """Response payload for the career navigator endpoint."""

    fit_percentage: float
    dimension_scores: List[DimensionScore]
    narrative: str


class CourseInformation(BaseModel):
    """Course information for learning recommendations."""

    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = Field(
        default=None,
        description="Course title",
        validation_alias=AliasChoices("title", "course_name", "name"),
    )
    description: Optional[str] = Field(
        default=None,
        description="Course description",
        validation_alias=AliasChoices("description", "course_description", "summary"),
    )
    category: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("category", "course_category"),
    )
    field: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("field", "discipline"),
    )
    skills: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("skills", "skills_youll_gain"),
    )
    key_concepts: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("key_concepts", "concepts"),
    )
    what_you_learn: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("what_you_learn", "learning_objectives", "what_you_ll_learn"),
    )

    @field_validator("skills", "key_concepts", "what_you_learn", mode="before")
    @classmethod
    def _ensure_iterable(cls, value: Any) -> List[str]:
        return _coerce_str_list(value)


class EmployeeProfile(BaseModel):
    """Employee profile for learning recommendations."""

    model_config = ConfigDict(populate_by_name=True)

    job_title: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("job_title", "current_role"),
    )
    skills: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("skills", "skillset"),
    )
    interests: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("interests", "focus_areas"),
    )
    competencies: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("competencies", "strengths"),
    )

    @field_validator("skills", "interests", "competencies", mode="before")
    @classmethod
    def _ensure_iterable(cls, value: Any) -> List[str]:
        return _coerce_str_list(value)


class LearningHubRequest(BaseModel):
    """Request payload for the learning hub endpoint."""

    course_information: CourseInformation
    employee_profile: EmployeeProfile


class LearningHubResponse(BaseModel):
    """Response payload for the learning hub endpoint."""

    recommendation: str


class RecommendedQuestion(BaseModel):
    """A recommended question for the chatbot."""
    
    id: str
    question: str
    category: Optional[str] = None


class RecommendedQuestionsResponse(BaseModel):
    """Response payload for the recommended questions endpoint."""
    
    questions: List[RecommendedQuestion]


class CommunityPost(BaseModel):
    """A community post for the Connect@PSA module."""

    title: str
    description: str
    time: str
    posted_by: str
    board: str


class CommunityBoardResponse(BaseModel):
    """Response payload for community board listings."""

    board: str
    items: List[CommunityPost]


class CourseSummary(BaseModel):
    """Summary information about a course."""

    topic: str
    name: str
    description: str
    field: str
    what_you_learn: List[str]
    skills: List[str]


class LearningCoursesResponse(BaseModel):
    """Response payload for the learning hub course catalogue."""

    courses: List[CourseSummary]


class JobSummary(BaseModel):
    """Summary of an internal job opportunity."""

    title: str
    duties: str
    requirements: Optional[str] = None


class JobsResponse(BaseModel):
    """Response payload for available jobs."""

    jobs: List[JobSummary]


class WellnessEvent(BaseModel):
    """A wellness event listing."""

    category: str
    title: str
    description: str
    date_time: str
    location: str


class WellnessEventsResponse(BaseModel):
    """Response payload for wellness events."""

    events: List[WellnessEvent]


class EmployeeProfileRecord(BaseModel):
    """Employee profile used across multiple modules."""

    employee_id: str
    personal_info: Dict[str, Any] = Field(default_factory=dict)
    employment_info: Dict[str, Any] = Field(default_factory=dict)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    competencies: List[Dict[str, Any]] = Field(default_factory=list)
    experiences: List[Dict[str, Any]] = Field(default_factory=list)
    positions_history: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
