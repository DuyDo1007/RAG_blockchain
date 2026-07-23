"""
Authentication API Endpoints (Registration, Login, Google OAuth, Refresh, Profile)
"""
from datetime import datetime
import os
import httpx
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, status
import bcrypt
from bson import ObjectId
from jose import jwt, JWTError

from backend.models.schemas import (
    UserCreate, UserLogin, GoogleAuthRequest, RefreshTokenRequest,
    TokenResponse, UserResponse
)
from backend.models.user import User
from backend.models.database import get_database
from backend.middleware.auth_middleware import (
    create_access_token, create_refresh_token, get_current_user,
    SECRET_KEY, ALGORITHM
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db = Depends(get_database)):
    """Register a new account using email and username"""
    # Check if email or username already exists
    existing_user = await db["users"].find_one({
        "$or": [{"email": user_data.email.lower()}, {"username": user_data.username}]
    })
    if existing_user:
        if existing_user.get("email") == user_data.email.lower():
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng (Email already registered)")
        else:
            raise HTTPException(status_code=400, detail="Tên người dùng này đã tồn tại (Username already taken)")

    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email.lower(),
        username=user_data.username,
        hashed_password=hashed_pw,
        auth_provider="local"
    )

    result = await db["users"].insert_one(new_user.model_dump(exclude={"id"}, by_alias=True))
    user_id = str(result.inserted_id)

    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db = Depends(get_database)):
    """Login with email and password"""
    user = await db["users"].find_one({"email": credentials.email.lower()})
    if not user or not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác (Invalid credentials)"
        )

    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác (Invalid credentials)"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa (Account inactive)"
        )

    user_id = str(user["_id"])
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/google", response_model=TokenResponse)
async def google_oauth(request: GoogleAuthRequest, db = Depends(get_database)):
    """Authenticate via Google OAuth ID token"""
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    id_token = request.id_token

    # Verify ID token with Google
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Google Token không hợp lệ (Invalid ID token)")
            token_info = resp.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Lỗi xác thực với Google: {str(e)}")

    if google_client_id and token_info.get("aud") != google_client_id:
        raise HTTPException(status_code=401, detail="Client ID không khớp (Audience mismatch)")

    email = token_info.get("email", "").lower()
    google_id = token_info.get("sub")
    name = token_info.get("name") or email.split("@")[0]
    picture = token_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Không lấy được email từ tài khoản Google")

    user = await db["users"].find_one({"$or": [{"google_id": google_id}, {"email": email}]})

    if user:
        # Update user profile if needed
        update_fields = {"updated_at": datetime.utcnow()}
        if not user.get("google_id"):
            update_fields["google_id"] = google_id
            update_fields["auth_provider"] = "google"
        if picture and not user.get("avatar_url"):
            update_fields["avatar_url"] = picture

        await db["users"].update_one({"_id": user["_id"]}, {"$set": update_fields})
        user_id = str(user["_id"])
    else:
        # Create new user via Google
        base_username = re_username = re_username_clean(name)
        # Ensure unique username
        counter = 1
        while await db["users"].find_one({"username": re_username}):
            re_username = f"{base_username}_{counter}"
            counter += 1

        new_user = User(
            email=email,
            username=re_username,
            auth_provider="google",
            google_id=google_id,
            avatar_url=picture
        )
        result = await db["users"].insert_one(new_user.model_dump(exclude={"id"}, by_alias=True))
        user_id = str(result.inserted_id)

    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def re_username_clean(name: str) -> str:
    """Clean username for new Google users"""
    import re
    clean = re.sub(r'[^a-zA-Z0-9_]', '', name.replace(' ', '_')).lower()
    return clean or f"user_{int(datetime.utcnow().timestamp())}"


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db = Depends(get_database)):
    """Issue new access token using a valid refresh token"""
    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Refresh token không hợp lệ")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ hoặc đã hết hạn")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User không hợp lệ hoặc đã bị vô hiệu hóa")

    new_access_token = create_access_token({"sub": user_id})
    new_refresh_token = create_refresh_token({"sub": user_id})

    return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)


async def build_user_response(user_dict: dict, db) -> UserResponse:
    u_id = str(user_dict["_id"])
    progress = await db["user_progress"].find_one({"user_id": u_id})
    completed_ids = progress.get("completed_lessons", []) if progress else []
    core_completed = [lid for lid in completed_ids if not str(lid).startswith("lab-")]
    labs_completed = [lid for lid in completed_ids if str(lid).startswith("lab-")]

    calculated_xp = len(core_completed) * 500 + len(labs_completed) * 1000
    raw_xp = user_dict.get("xp") or 0
    effective_xp = max(raw_xp, calculated_xp)

    if raw_xp < effective_xp:
        await db["users"].update_one(
            {"_id": user_dict["_id"]},
            {"$set": {"xp": effective_xp}}
        )

    return UserResponse(
        id=u_id,
        email=user_dict["email"],
        username=user_dict["username"],
        auth_provider=user_dict.get("auth_provider", "local"),
        role=user_dict.get("role", "user"),
        avatar_url=user_dict.get("avatar_url"),
        xp=effective_xp,
        current_streak=user_dict.get("current_streak", 1 if len(completed_ids) > 0 else 0),
        max_streak=user_dict.get("max_streak", 1 if len(completed_ids) > 0 else 0),
        last_active_date=user_dict.get("last_active_date"),
        badges=user_dict.get("badges", []),
        created_at=user_dict.get("created_at", datetime.utcnow())
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get current logged-in user profile with accurate XP and streak stats"""
    return await build_user_response(current_user, db)


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update current logged-in user profile"""
    update_dict = {}
    if update_data.username is not None:
        username_clean = update_data.username.strip()
        if not username_clean:
            raise HTTPException(status_code=400, detail="Tên người dùng không được để trống")
        existing = await db["users"].find_one({"username": username_clean, "_id": {"$ne": current_user["_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Tên người dùng đã tồn tại")
        update_dict["username"] = username_clean

    if update_data.avatar_url is not None:
        update_dict["avatar_url"] = update_data.avatar_url.strip()

    if update_dict:
        await db["users"].update_one(
            {"_id": current_user["_id"]},
            {"$set": update_dict}
        )
        updated_user = await db["users"].find_one({"_id": current_user["_id"]})
    else:
        updated_user = current_user

    return await build_user_response(updated_user, db)


@router.delete("/me")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Delete current logged-in user account and their progress"""
    user_id = str(current_user["_id"])
    
    # 1. Delete user progress records
    await db["user_progress"].delete_many({"user_id": user_id})
    
    # 2. Delete user account
    await db["users"].delete_one({"_id": current_user["_id"]})
    
    return {"message": "Xóa tài khoản thành công"}

