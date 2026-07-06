"""
MongoDB Database Manager using Motor (async) with local JSON fallback
"""
import os
import json
import asyncio
from typing import Optional
from datetime import datetime
from bson import ObjectId
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

# =====================================================================
# Local JSON Database Fallback Classes
# =====================================================================

class MockCursor:
    def __init__(self, data):
        self.data = data
        
    def sort(self, key, direction=-1):
        reverse = direction == -1
        try:
            self.data = sorted(self.data, key=lambda x: x.get(key, ""), reverse=reverse)
        except Exception:
            pass
        return self
        
    def limit(self, limit_num):
        self.data = self.data[:limit_num]
        return self
        
    async def to_list(self, length=None):
        if length is not None:
            return self.data[:length]
        return self.data


class MockCollection:
    def __init__(self, db_path, collection_name):
        self.file_path = os.path.join(db_path, f"{collection_name}.json")
        os.makedirs(db_path, exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump([], f)
                
    def _read(self):
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
            
    def _write(self, data):
        with open(self.file_path, "w", encoding="utf-8") as f:
            def encoder(obj):
                if isinstance(obj, (datetime, ObjectId)):
                    return str(obj)
                raise TypeError
            json.dump(data, f, default=encoder, indent=2, ensure_ascii=False)

    async def create_index(self, *args, **kwargs):
        pass

    async def insert_one(self, document):
        data = self._read()
        if "_id" not in document:
            document["_id"] = str(ObjectId())
        elif isinstance(document["_id"], ObjectId):
            document["_id"] = str(document["_id"])
            
        data.append(document)
        self._write(data)
        
        class InsertResult:
            inserted_id = document["_id"]
        return InsertResult()

    def find(self, query=None):
        data = self._read()
        if not query:
            return MockCursor(data)
            
        filtered = []
        for doc in data:
            match = True
            for k, v in query.items():
                if str(doc.get(k)) != str(v):
                    match = False
                    break
            if match:
                filtered.append(doc)
        return MockCursor(filtered)

    async def find_one(self, query):
        data = self._read()
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif str(doc.get(k)) != str(v):
                    match = False
                    break
            if match:
                return doc
        return None

    async def update_one(self, query, update):
        data = self._read()
        updated_count = 0
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif str(doc.get(k)) != str(v):
                    match = False
                    break
            if match:
                if "$set" in update:
                    for uk, uv in update["$set"].items():
                        if isinstance(uv, datetime):
                            uv = uv.isoformat()
                        doc[uk] = uv
                if "$push" in update:
                    for uk, uv in update["$push"].items():
                        if uk not in doc or not isinstance(doc[uk], list):
                            doc[uk] = []
                        if isinstance(uv, dict):
                            for sk, sv in list(uv.items()):
                                if isinstance(sv, datetime):
                                    uv[sk] = sv.isoformat()
                                elif isinstance(sv, ObjectId):
                                    uv[sk] = str(sv)
                        doc[uk].append(uv)
                updated_count += 1
                break
                
        if updated_count > 0:
            self._write(data)
            
        class UpdateResult:
            modified_count = updated_count
            upserted_id = None
        return UpdateResult()

    async def delete_one(self, query):
        data = self._read()
        new_data = []
        deleted = 0
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif str(doc.get(k)) != str(v):
                    match = False
                    break
            if match and deleted == 0:
                deleted += 1
            else:
                new_data.append(doc)
                
        if deleted > 0:
            self._write(new_data)
            
        class DeleteResult:
            deleted_count = deleted
        return DeleteResult()


class MockDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        
    def __getitem__(self, name):
        return MockCollection(self.db_path, name)
        
    async def command(self, name):
        if name == "ping":
            return {"ok": 1}
        return {}


class MockClient:
    def close(self):
        pass


# =====================================================================
# Database Manager
# =====================================================================

class MongoDBManager:
    client: Optional = None
    db: Optional = None
    fallback_mode: bool = False

    @classmethod
    async def connect_to_mongo(cls):
        """Connect to MongoDB or fallback to local JSON database"""
        mongo_url = os.getenv("MONGO_URL", "mongodb://mongo:27017")
        db_name = os.getenv("MONGO_DB", "genai_blockchain")
        
        try:
            print(f"[Database] Connecting to MongoDB at: {mongo_url} ...")
            # Set short timeout (5s) for selection to fail fast if blocked/offline
            cls.client = motor.motor_asyncio.AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            # Test connectivity immediately
            cls.db = cls.client[db_name]
            await cls.db.command("ping")
            
            # Create indexes
            await cls._create_indexes()
            cls.fallback_mode = False
            print(f"[Database] Successfully connected to MongoDB: {db_name}")
            
        except Exception as e:
            print(f"[Database] MongoDB Connection failed: {e}")
            print("[Database] Switching to local JSON Database Fallback mode...")
            
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            local_db_path = os.path.join(base_dir, "data", "local_db")
            
            cls.client = MockClient()
            cls.db = MockDatabase(local_db_path)
            cls.fallback_mode = True
            print(f"[Database] Local JSON Database initialized at: {local_db_path}")

    @classmethod
    async def close_mongo_connection(cls):
        """Close database connection"""
        if cls.client is not None:
            cls.client.close()
            print("[Database] Closed database connection")

    @classmethod
    async def _create_indexes(cls):
        """Create database indexes for performance"""
        if cls.db is None or cls.fallback_mode:
            return
        
        try:
            # Chat sessions index
            await cls.db["chat_sessions"].create_index("user_id")
            await cls.db["chat_sessions"].create_index("created_at")
            
            # User progress index
            await cls.db["user_progress"].create_index("user_id")
            await cls.db["user_progress"].create_index("roadmap_id")
            
            # Learning roadmap index
            await cls.db["learning_roadmaps"].create_index("target_audience")
            
            print("[Database] Database indexes created")
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
