"""
Qdrant Vector Store Wrapper Service for Production Hybrid Search
"""
import os
from typing import List, Dict, Any, Optional
from qdrant_client import AsyncQdrantClient, QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue
)


class QdrantVectorStore:
    _instance = None
    _async_client: Optional[AsyncQdrantClient] = None
    _sync_client: Optional[QdrantClient] = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = QdrantVectorStore()
        return cls._instance

    def __init__(self):
        self.url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection_name = os.getenv("QDRANT_COLLECTION", "blockchain_security")
        self.vector_size = 768  # Microsoft CodeBERT dimension

    @property
    def async_client(self) -> AsyncQdrantClient:
        if self._async_client is None:
            self._async_client = AsyncQdrantClient(url=self.url, timeout=20.0)
        return self._async_client

    @property
    def sync_client(self) -> QdrantClient:
        if self._sync_client is None:
            self._sync_client = QdrantClient(url=self.url, timeout=20.0)
        return self._sync_client

    async def health_check(self) -> bool:
        """Check Qdrant server connectivity"""
        try:
            info = await self.async_client.get_collections()
            return True
        except Exception as e:
            print(f"[Qdrant] Health check failed: {e}")
            return False

    async def create_collection(self, collection_name: Optional[str] = None, vector_size: int = 768):
        """Create vector collection if it does not exist"""
        col_name = collection_name or self.collection_name
        try:
            collections = await self.async_client.get_collections()
            col_names = [c.name for c in collections.collections]
            if col_name not in col_names:
                print(f"[Qdrant] Creating collection: {col_name} (size={vector_size})")
                await self.async_client.create_collection(
                    collection_name=col_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
                )
                print(f"[Qdrant] Created collection successfully: {col_name}")
        except Exception as e:
            print(f"[Qdrant] Create collection error: {e}")
            raise e

    async def upsert_documents(
        self,
        documents: List[Dict[str, Any]],
        vectors: List[List[float]],
        collection_name: Optional[str] = None
    ):
        """Batch upsert embeddings and metadata into Qdrant"""
        col_name = collection_name or self.collection_name
        points = []
        for i, (doc, vec) in enumerate(zip(documents, vectors)):
            point_id = doc.get("id") or i
            # Ensure ID is int or UUID string
            if isinstance(point_id, str) and not point_id.isdigit():
                import hashlib
                point_id = int(hashlib.sha256(point_id.encode()).hexdigest()[:15], 16)
            elif isinstance(point_id, str):
                point_id = int(point_id)

            points.append(
                PointStruct(
                    id=point_id,
                    vector=vec,
                    payload=doc
                )
            )

        # Upsert in chunks of 100 to avoid large payload timeout
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            await self.async_client.upsert(
                collection_name=col_name,
                points=batch
            )
        print(f"[Qdrant] Successfully upserted {len(points)} points to '{col_name}'")

    async def search(
        self,
        query_vector: List[float],
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search vector database by query embedding"""
        col_name = collection_name or self.collection_name
        
        qdrant_filter = None
        if filters:
            conditions = []
            for k, v in filters.items():
                conditions.append(FieldCondition(key=k, match=MatchValue(value=v)))
            qdrant_filter = Filter(must=conditions)

        try:
            search_result = await self.async_client.search(
                collection_name=col_name,
                query_vector=query_vector,
                limit=top_k,
                query_filter=qdrant_filter
            )

            results = []
            for hit in search_result:
                doc = hit.payload or {}
                doc["_score"] = hit.score
                results.append(doc)
            return results
        except Exception as e:
            print(f"[Qdrant] Search error: {e}")
            return []

    async def delete_collection(self, collection_name: Optional[str] = None):
        """Delete vector collection"""
        col_name = collection_name or self.collection_name
        await self.async_client.delete_collection(collection_name=col_name)
        print(f"[Qdrant] Deleted collection '{col_name}'")
