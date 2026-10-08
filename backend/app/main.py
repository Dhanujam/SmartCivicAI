import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routes.auth import router as auth_router
from app.routes.complaints import router as complaints_router
from app.routes.admin import router as admin_router
from app.routes.analytics import router as analytics_router
from app.services.auth import ensure_admin_user

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("smartcivic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SmartCivic AI Backend...")
    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    await connect_to_mongo()
    # Seed default Government Official account if none exists
    await ensure_admin_user()
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("SmartCivic AI Backend shutdown complete.")


app = FastAPI(
    title="SmartCivic AI API",
    description="Smart Complaint Triage & Resolution Platform for Civic Bodies",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
origins = settings.cors_origin_list
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files if directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.routes.security import router as security_router

# HTTP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(security_router, prefix="/api")


@app.get("/health", tags=["Health"])
async def health_check():
    from app.database import get_database
    db_instance = get_database()
    db_status = "connected" if db_instance is not None else "disconnected (set MONGODB_URI in backend/.env)"
    return {
        "status": "healthy",
        "service": "SmartCivic AI Backend",
        "database": db_status,
        "version": "1.0.0",
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Welcome to SmartCivic AI API",
        "docs_url": "/docs",
        "health_url": "/health",
    }
