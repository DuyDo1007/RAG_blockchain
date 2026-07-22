"""
MongoDB Schemas using Pydantic & Motor
"""
from pydantic import BaseModel, Field, ConfigDict, GetCoreSchemaHandler
from typing import List, Optional, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema


class _ObjectIdPydanticAnnotation:
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x),
                return_schema=core_schema.str_schema()
            )
        )

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError(f"Invalid ObjectId: {v}")


PyObjectId = Annotated[ObjectId, _ObjectIdPydanticAnnotation]


class Message(BaseModel):
    """Individual message in a chat session"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sources: Optional[List[str]] = None  # RAG sources

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat(), ObjectId: str}
    )


class ChatSession(BaseModel):
    """Chat session (conversation history)"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    title: str
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    model: str = "gemini-pro"  # LLM model used

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat(), ObjectId: str}
    )


class RoadmapLesson(BaseModel):
    """Individual lesson in learning roadmap"""
    id: str
    title: str
    description: str
    duration_minutes: int
    difficulty: str  # beginner, intermediate, advanced
    content_url: Optional[str] = None
    resources: Optional[List[str]] = None
    quiz_questions: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )


class LearningRoadmap(BaseModel):
    """Learning roadmap for beginners"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    title: str
    description: str
    target_audience: str  # "beginner", "intermediate", etc.
    lessons: List[RoadmapLesson] = []
    estimated_duration_hours: float
    prerequisites: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat(), ObjectId: str}
    )


class UserProgress(BaseModel):
    """Track user's learning progress"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    roadmap_id: str
    completed_lessons: List[str] = []
    current_lesson: Any = 0
    progress_percentage: float = 0.0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat(), ObjectId: str}
    )


class CreateChatRequest(BaseModel):
    """Request to create/send chat message"""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    message: str
    model: str = "gemini-3.5-flash"

    model_config = ConfigDict(
        arbitrary_types_allowed=True
    )


class ChatResponse(BaseModel):
    """Response from chat API"""
    session_id: str
    message_id: str
    content: str
    sources: Optional[List[str]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    title: Optional[str] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )


# =====================================================================
# Authentication & User Schemas
# =====================================================================

class UserCreate(BaseModel):
    """Request schema for user registration"""
    email: str
    username: str
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    """Request schema for user login"""
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    """Request schema for Google OAuth verification"""
    id_token: str


class RefreshTokenRequest(BaseModel):
    """Request schema for token refresh"""
    refresh_token: str


class TokenResponse(BaseModel):
    """Response schema containing JWT tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Response schema for user profile info"""
    id: str
    email: str
    username: str
    auth_provider: str
    role: str = "user"
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat()}
    )



