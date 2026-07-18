"""
MongoDB User Model using Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime
from bson import ObjectId
from backend.models.schemas import PyObjectId


class User(BaseModel):
    """User account model for MongoDB"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    email: str = Field(..., description="Unique email address")
    username: str = Field(..., description="Unique display username")
    hashed_password: Optional[str] = Field(default=None, description="Hashed password (None if OAuth)")
    auth_provider: str = Field(default="local", description="Authentication provider: 'local' or 'google'")
    google_id: Optional[str] = Field(default=None, description="Google OAuth subject ID")
    avatar_url: Optional[str] = Field(default=None, description="Profile avatar URL")
    is_active: bool = Field(default=True, description="Whether user account is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda v: v.isoformat(), ObjectId: str}
    )
