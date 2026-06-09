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
            # Return empty embedding of expected dimension (768 for models/text-embedding-004)
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
    Returns Google Gemini API embeddings. No local model loading — safe for low-RAM environments.
    Raises an error if the API key is missing or invalid.
    """
    # DO NOT fall back to HuggingFace/sentence-transformers.
    # Loading PyTorch on Render's 512MB free tier causes OOM kill.
    api_key = config.GEMINI_API_KEY
    if not api_key or api_key.strip() == "" or api_key == "your_api_key_here":
        raise ValueError(
            "[Embeddings] GOOGLE_API_KEY is missing. "
            "Add it to your .env file or Render environment variables."
        )

    print(f"[Embeddings] Using Google Gemini Embeddings: {config.EMBEDDING_MODEL}", file=sys.stderr)
    return SafeGoogleGenerativeAIEmbeddings(
        model=config.EMBEDDING_MODEL,
        google_api_key=api_key
    )
