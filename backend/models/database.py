"""
MongoDB Database Manager using Motor (async) for Production
"""
import os
import asyncio
from typing import Optional
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()


class MongoDBManager:
    client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
    db = None

    @classmethod
    async def connect_to_mongo(cls):
        """Connect to MongoDB server"""
        mongo_url = os.getenv("MONGO_URL", "mongodb://admin:password123@localhost:27017")
        db_name = os.getenv("MONGO_DB", "genai_blockchain")
        
        try:
            print(f"[Database] Connecting to MongoDB at: {mongo_url} ...")
            cls.client = motor.motor_asyncio.AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000
            )
            cls.db = cls.client[db_name]
            # Test connectivity immediately
            await cls.db.command("ping")
            
            # Create indexes
            await cls._create_indexes()
            print(f"[Database] Successfully connected to MongoDB: {db_name}")
            
        except Exception as e:
            print(f"[Database] CRITICAL: MongoDB Connection failed: {e}")
            raise RuntimeError(f"Could not connect to MongoDB: {e}")

    @classmethod
    async def close_mongo_connection(cls):
        """Close database connection"""
        if cls.client is not None:
            cls.client.close()
            print("[Database] Closed database connection")

    @classmethod
    async def _create_indexes(cls):
        """Create database indexes for performance and uniqueness"""
        if cls.db is None:
            return
        
        try:
            # Users index
            await cls.db["users"].create_index("email", unique=True)
            await cls.db["users"].create_index("username", unique=True)
            await cls.db["users"].create_index("google_id", sparse=True)

            # Chat sessions index
            await cls.db["chat_sessions"].create_index("user_id")
            await cls.db["chat_sessions"].create_index("created_at")
            
            # User progress index
            await cls.db["user_progress"].create_index("user_id")
            await cls.db["user_progress"].create_index("roadmap_id")
            
            # Learning roadmap index
            await cls.db["learning_roadmaps"].create_index("target_audience")

            # Contract audit cache index
            await cls.db["contract_cache"].create_index("address", unique=True)
            
            print("[Database] Database indexes created successfully")
        except Exception as e:
            print(f"[Database] Index creation skipped or failed: {e}")

    @classmethod
    def get_db(cls):
        """Get database instance"""
        if cls.db is None:
            raise RuntimeError("Database not connected. Call connect_to_mongo() first.")
        return cls.db


async def get_database():
    """Dependency for FastAPI"""
    return MongoDBManager.get_db()
