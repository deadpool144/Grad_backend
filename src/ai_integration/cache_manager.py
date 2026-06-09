import sqlite3
import os
import hashlib
import time

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DB_PATH = os.path.join(CURRENT_DIR, "chat_cache.db")

def init_cache_db():
    """
    Initializes the SQLite cache database.
    """
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS response_cache (
                query_hash TEXT PRIMARY KEY,
                query_text TEXT,
                response_text TEXT,
                timestamp INTEGER
            )
        ''')
        conn.commit()
        conn.close()
    except Exception as e:
        import sys
        sys.stderr.write(f"[CacheManager] Failed to initialize database: {e}\n")

def get_cached_response(query: str, ttl_seconds: int = 86400) -> str:
    """
    Checks if a cached response exists for the normalized query and is within TTL.
    """
    if not query or not query.strip():
        return None
        
    normalized_query = query.strip().lower()
    query_hash = hashlib.sha256(normalized_query.encode('utf-8')).hexdigest()
    
    try:
        if not os.path.exists(CACHE_DB_PATH):
            init_cache_db()
            return None
            
        conn = sqlite3.connect(CACHE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT response_text, timestamp FROM response_cache WHERE query_hash = ?",
            (query_hash,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            response_text, timestamp = row
            # Verify if cached response is within the TTL (Time-To-Live) window
            if time.time() - timestamp < ttl_seconds:
                return response_text
    except Exception as e:
        import sys
        sys.stderr.write(f"[CacheManager] Read error: {e}\n")
    return None

def set_cached_response(query: str, response: str):
    """
    Caches the response for a query.
    """
    if not query or not query.strip() or not response or not response.strip():
        return
        
    normalized_query = query.strip().lower()
    query_hash = hashlib.sha256(normalized_query.encode('utf-8')).hexdigest()
    
    try:
        init_cache_db()
        conn = sqlite3.connect(CACHE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO response_cache (query_hash, query_text, response_text, timestamp) VALUES (?, ?, ?, ?)",
            (query_hash, query.strip(), response.strip(), int(time.time()))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        import sys
        sys.stderr.write(f"[CacheManager] Write error: {e}\n")
