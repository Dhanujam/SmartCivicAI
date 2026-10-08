import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId
import bcrypt
import jwt
from fastapi import HTTPException, Security, status as http_status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.database import get_users_collection

logger = logging.getLogger("smartcivic.auth")

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.warning("Password verification failed with error: %s", e)
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> dict:
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    users_collection = get_users_collection()
    if users_collection is None:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable. Could not verify credentials.",
        )

    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = await users_collection.find_one({"id": user_id})

    if not user_doc:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_doc["id"] = str(user_doc["_id"])
    return user_doc


async def get_optional_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Optional[dict]:
    if not auth_credentials or not auth_credentials.credentials:
        return None
    try:
        return await get_current_user(auth_credentials)
    except HTTPException:
        return None
    except Exception:
        return None


async def require_admin(
    current_user: dict = Security(get_current_user),
) -> dict:
    role = current_user.get("role")
    if role != "ADMIN":
        logger.warning(
            "Access denied to admin endpoint for user %s (role: %s)",
            current_user.get("email"),
            role,
        )
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Government Official privileges required.",
        )
    return current_user


async def require_citizen(
    current_user: dict = Security(get_current_user),
) -> dict:
    role = current_user.get("role")
    if role != "CITIZEN":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Citizen privileges required.",
        )
    return current_user


async def ensure_admin_user():
    """
    Controlled setup mechanism: automatically seeds the default Government Official
    account if none exists in MongoDB Atlas, using settings.DEFAULT_ADMIN_EMAIL.
    """
    users_collection = get_users_collection()
    if users_collection is None:
        logger.warning("Users collection unavailable, skipping admin seeding.")
        return

    try:
        admin_count = await users_collection.count_documents({"role": "ADMIN"})
        if admin_count == 0:
            logger.info("No Government Official account found. Seeding default admin...")
            email = settings.DEFAULT_ADMIN_EMAIL.lower().strip()
            # Check if this email exists with any role
            existing = await users_collection.find_one({"email": email})
            if existing:
                await users_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"role": "ADMIN"}},
                )
                logger.info("Updated existing user %s to ADMIN role.", email)
            else:
                now = datetime.now(timezone.utc)
                admin_doc = {
                    "name": settings.DEFAULT_ADMIN_NAME,
                    "email": email,
                    "password_hash": hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                    "role": "ADMIN",
                    "created_at": now,
                    "updated_at": now,
                }
                res = await users_collection.insert_one(admin_doc)
                logger.info(
                    "Default Government Official created (ID: %s, email: %s)",
                    str(res.inserted_id),
                    email,
                )
        else:
            logger.info("Government Official account(s) already exist in database (%d found).", admin_count)
    except Exception as e:
        logger.error("Failed to seed default Government Official: %s", e)
