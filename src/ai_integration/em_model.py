import time
import random
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import config

class SafeGoogleGenerativeAIEmbeddings(GoogleGenerativeAIEmbeddings):
    """
    Custom wrapper around GoogleGenerativeAIEmbeddings that:
    1. Fixes batch size issues by running queries concurrently using ThreadPoolExecutor.
    2. Gracefully handles 429 rate limit (RESOURCE_EXHAUSTED) errors with exponential backoff.
    """
    def embed_query_with_retry(self, text: str, max_retries: int = 5) -> list[float]:
        if not text or not text.strip():
            # Return empty embedding of expected dimension (768 for models/embedding-001)
            return [0.0] * 768
            
        for attempt in range(max_retries):
            try:
                return super().embed_query(text)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    sleep_time = (2 ** attempt) + random.uniform(0.1, 1.0)
                    print(f"\n[RATE LIMIT] 429 Resource Exhausted. Retrying chunk in {sleep_time:.2f}s (Attempt {attempt+1}/{max_retries})...", file=sys.stderr)
                    time.sleep(sleep_time)
                else:
                    raise e
        return super().embed_query(text)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        with ThreadPoolExecutor(max_workers=5) as executor:
            return list(executor.map(self.embed_query_with_retry, texts))

def embeddings_model():
    """
    Returns the configured SafeGoogleGenerativeAIEmbeddings model.
    If configured to use local embeddings, or if the API Key is invalid,
    falls back to local HuggingFace embeddings.
    """
    if getattr(config, "USE_LOCAL_EMBEDDINGS", False):
        # Directly use local HuggingFace embeddings to save Google API quota
        print("[Embeddings] Using local HuggingFaceEmbeddings (all-MiniLM-L6-v2) to save Gemini API quota.", file=sys.stderr)
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    api_key = config.GEMINI_API_KEY
    if api_key and api_key != "your_api_key_here" and api_key.strip() != "":
        try:
            # Attempt to initialize and validate Google Generative AI Embeddings
            embeddings = SafeGoogleGenerativeAIEmbeddings(
                model=config.EMBEDDING_MODEL,
                google_api_key=api_key
            )
            # Validate API key with a test embedding call
            embeddings.embed_query("test")
            return embeddings
        except Exception as e:
            print(f"[Embeddings] Warning: Google embeddings validation failed (key may be invalid/expired): {e}", file=sys.stderr)
            
    # Fallback to local HuggingFace embeddings
    print("[Embeddings] Falling back to local HuggingFaceEmbeddings (all-MiniLM-L6-v2)...", file=sys.stderr)
    from langchain_community.embeddings import HuggingFaceEmbeddings
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
