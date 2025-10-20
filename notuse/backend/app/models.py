from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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
    sources: List[ChatbotSource]


class CommunityPolishRequest(BaseModel):
    """Request payload for the community polish endpoint."""

    content: str
    tone: str = Field(description="One of: Professional, Friendly, Concise")


class CommunityPolishResponse(BaseModel):
    """Response payload for the community polish endpoint."""

    polished_content: str


class JobInformation(BaseModel):
    """Job information for career navigation."""
    
    title: str = Field(description="Job title")
    description: str = Field(description="Job description")
    requirements: Optional[str] = None


class EmployeeInformation(BaseModel):
    """Employee information for career navigation."""
    
    current_role: str
    skills: List[str]
    experience: Optional[str] = None


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
    
    title: str = Field(description="Course title")
    description: str = Field(description="Course description")
    category: Optional[str] = None
    skills: Optional[List[str]] = None


class EmployeeProfile(BaseModel):
    """Employee profile for learning recommendations."""
    
    job_title: str
    skills: List[str]
    interests: Optional[List[str]] = None


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


class CommunityPostModel(BaseModel):
    title: str
    description: str
    time: str
    posted_by: str
    board: str


class CommunityFeedResponse(BaseModel):
    board: str
    items: List[CommunityPostModel]


class CourseModel(BaseModel):
    topic: str
    name: str
    description: str
    field: str
    what_you_learn: List[str]
    skills: List[str]


class CourseListResponse(BaseModel):
    courses: List[CourseModel]


class JobModel(BaseModel):
    title: str
    duties: str
    requirements: str


class JobListResponse(BaseModel):
    jobs: List[JobModel]


class WellnessEventModel(BaseModel):
    category: str
    title: str
    description: str
    date_time: str
    location: str


class WellnessListResponse(BaseModel):
    events: List[WellnessEventModel]


class EmployeeProfileResponse(BaseModel):
    employee_id: str
    personal_info: Dict[str, Any]
    employment_info: Dict[str, Any]
    skills: List[Dict[str, Any]]
    competencies: List[Dict[str, Any]]
    experiences: List[Dict[str, Any]]
    positions_history: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
