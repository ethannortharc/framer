"""
Vector Service for semantic search using ChromaDB.

ChromaDB runs embedded (in-process), persists to /data/vector_db/.
Two collections: 'frames' and 'knowledge'.
Default embeddings: ChromaDB built-in sentence-transformers.
Set EMBEDDING_PROVIDER=openai to use text-embedding-3-small.
"""
import os
from pathlib import Path
from typing import Any, Optional


class VectorService:
    """Service for vector storage and semantic search."""

    def __init__(self, data_path: Path):
        self.data_path = Path(data_path)
        self.vector_db_path = self.data_path / "vector_db"
        self.vector_db_path.mkdir(parents=True, exist_ok=True)
        self._client = None
        self._collections: dict[str, Any] = {}

    def _get_client(self) -> Any:
        if self._client is None:
            try:
                import chromadb
                self._client = chromadb.PersistentClient(
                    path=str(self.vector_db_path)
                )
            except ImportError:
                raise RuntimeError(
                    "chromadb package not installed. Install with: pip install chromadb"
                )
        return self._client

    def _get_embedding_function(self) -> Any:
        provider = os.getenv("EMBEDDING_PROVIDER", "default")
        if provider == "openai":
            try:
                import chromadb.utils.embedding_functions as ef
                api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
                return ef.OpenAIEmbeddingFunction(
                    api_key=api_key,
                    model_name="text-embedding-3-small",
                )
            except ImportError:
                pass
        # Default: use ChromaDB's built-in embeddings
        return None

    def _get_collection(self, collection_name: str) -> Any:
        if collection_name not in self._collections:
            client = self._get_client()
            ef = self._get_embedding_function()
            kwargs = {"name": collection_name}
            if ef:
                kwargs["embedding_function"] = ef
            self._collections[collection_name] = client.get_or_create_collection(**kwargs)
        return self._collections[collection_name]

    def store_embedding(
        self,
        id: str,
        collection: str,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        coll = self._get_collection(collection)
        coll.upsert(
            ids=[id],
            documents=[content],
            metadatas=[metadata or {}],
        )

    def search(
        self,
        query: str,
        collection: str,
        limit: int = 5,
        where: Optional[dict[str, Any]] = None,
    ) -> list[dict[str, Any]]:
        coll = self._get_collection(collection)
        kwargs: dict[str, Any] = {
            "query_texts": [query],
            "n_results": min(limit, coll.count()) if coll.count() > 0 else limit,
        }
        if where:
            kwargs["where"] = where

        if coll.count() == 0:
            return []

        results = coll.query(**kwargs)

        items = []
        if results and results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                item: dict[str, Any] = {"id": doc_id}
                if results.get("documents") and results["documents"][0]:
                    item["content"] = results["documents"][0][i]
                if results.get("metadatas") and results["metadatas"][0]:
                    item["metadata"] = results["metadatas"][0][i]
                if results.get("distances") and results["distances"][0]:
                    item["distance"] = results["distances"][0][i]
                items.append(item)

        return items

    def delete_embedding(self, id: str, collection: str) -> None:
        coll = self._get_collection(collection)
        coll.delete(ids=[id])
