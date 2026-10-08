import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("smartcivic.db")

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo():
    global client, db
    if not settings.MONGODB_URI:
        logger.warning("MONGODB_URI is not set. Database operations will be unavailable until configured.")
        client = None
        db = None
        return

    db_name = settings.database_name
    try:
        logger.info("Connecting to MongoDB Atlas...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
        )
        # Verify connection with ping
        await client.admin.command("ping")
        db = client[db_name]
        logger.info("Successfully connected to MongoDB Atlas (%s)", db_name)
    except Exception as e:
        logger.error("Failed to connect to MongoDB Atlas: %s", str(e))
        client = None
        db = None


async def close_mongo_connection():
    global client, db
    if client:
        logger.info("Closing MongoDB connection...")
        client.close()
        client = None
        db = None
        logger.info("MongoDB connection closed.")


def _ensure_db() -> Optional[AsyncIOMotorDatabase]:
    global client, db
    if db is None and settings.MONGODB_URI:
        try:
            db_name = settings.database_name
            client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
            )
            db = client[db_name]
        except Exception as e:
            logger.error("Failed to lazily initialize MongoDB client: %s", e)
    return db


def get_database() -> Optional[AsyncIOMotorDatabase]:
    return _ensure_db()


def get_complaints_collection():
    d = _ensure_db()
    if d is not None:
        return d["complaints"]
    return None


def get_users_collection():
    d = _ensure_db()
    if d is not None:
        return d["users"]
    return None


def get_counters_collection():
    d = _ensure_db()
    if d is not None:
        return d["counters"]
    return None


async def get_next_complaint_id() -> str:
    """
    Atomically generates the next unique human-readable complaint ID in the format:
    CIV-2026-000001, CIV-2026-000002, etc.
    """
    from pymongo import ReturnDocument
    import random

    year = 2026
    counter_id = f"complaints_{year}"
    counters = get_counters_collection()

    if counters is not None:
        try:
            doc = await counters.find_one_and_update(
                {"_id": counter_id},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            seq = doc.get("seq", 1) if doc else 1
            return f"CIV-{year}-{seq:06d}"
        except Exception as e:
            logger.warning("Counter increment error: %s, using fallback", e)

    # Fallback if DB counter unavailable
    return f"CIV-{year}-{random.randint(100000, 999999)}"

