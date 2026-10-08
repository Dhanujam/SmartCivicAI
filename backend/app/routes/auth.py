import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status as http_status

from app.models.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.database import get_users_collection
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger("smartcivic.routes.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=http_status.HTTP_201_CREATED)
async def register_user(data: UserRegister):
    """
    Public citizen registration.
    Always assigns role = 'CITIZEN'. Never allows registering as ADMIN.
    """
    users = get_users_collection()
    if users is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    # Password confirmation check
    if data.confirm_password and data.password != data.confirm_password:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Password and confirmation password do not match.",
        )

    clean_email = data.email.lower().strip()
    clean_name = data.name.strip()

    # Check for existing account
    existing_user = await users.find_one({"email": clean_email})
    if existing_user:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in.",
        )

    now = datetime.now(timezone.utc)
    hashed = hash_password(data.password)

    # Strictly enforce role = "CITIZEN"
    user_doc = {
        "name": clean_name,
        "email": clean_email,
        "password_hash": hashed,
        "role": "CITIZEN",
        "created_at": now,
        "updated_at": now,
    }

    try:
        insert_res = await users.insert_one(user_doc)
        user_id = str(insert_res.inserted_id)
        user_doc["id"] = user_id

        # Generate JWT access token
        access_token = create_access_token({
            "sub": user_id,
            "email": clean_email,
            "role": "CITIZEN",
        })

        logger.info("Citizen registered successfully: %s (ID: %s)", clean_email, user_id)

        user_resp = UserResponse(
            id=user_id,
            name=clean_name,
            email=clean_email,
            role="CITIZEN",
            created_at=now,
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_resp,
        )
    except Exception as e:
        logger.error("User registration error: %s", e)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
async def login_user(data: UserLogin):
    """
    Authenticate user (Citizen or Government Official) and return JWT access token.
    Backend determines role; frontend does not dictate permissions.
    """
    users = get_users_collection()
    if users is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Please verify MongoDB Atlas connection.",
        )

    clean_email = data.email.lower().strip()
    user_doc = await users.find_one({"email": clean_email})

    if not user_doc or not verify_password(data.password, user_doc.get("password_hash", "")):
        logger.warning("Failed login attempt for email: %s", clean_email)
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(user_doc["_id"])
    role = user_doc.get("role", "CITIZEN")

    access_token = create_access_token({
        "sub": user_id,
        "email": clean_email,
        "role": role,
    })

    logger.info("User login successful: %s (Role: %s)", clean_email, role)

    user_resp = UserResponse(
        id=user_id,
        name=user_doc.get("name", "Citizen"),
        email=clean_email,
        role=role,
        created_at=user_doc.get("created_at") or datetime.now(timezone.utc),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Get profile of currently authenticated user from validated JWT.
    """
    return UserResponse(
        id=current_user["id"],
        name=current_user.get("name", "Citizen"),
        email=current_user.get("email", ""),
        role=current_user.get("role", "CITIZEN"),
        created_at=current_user.get("created_at") or datetime.now(timezone.utc),
    )
