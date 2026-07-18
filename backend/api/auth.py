"""
Authentication API Endpoints (Registration, Login, Google OAuth, Refresh, Profile)
"""
from datetime import datetime
import os
import httpx
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


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current logged-in user profile"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        username=current_user["username"],
        auth_provider=current_user.get("auth_provider", "local"),
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user.get("created_at", datetime.utcnow())
    )
