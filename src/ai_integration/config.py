import os
from pathlib import Path
import dotenv

# Resolve paths relative to this directory
AI_DIR = Path(__file__).resolve().parent
BASE_DIR = AI_DIR.parent.parent  # Resolves back to server root (server/src/ai_integration -> server)
ENV_PATH = BASE_DIR / ".env"

# Load the environment variables
if ENV_PATH.exists():
    dotenv.load_dotenv(dotenv_path=ENV_PATH)
else:
    dotenv.load_dotenv()

# Read key values (supports both GOOGLE_API_KEY and GEMINI_API_KEY)
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

# Ensure only GOOGLE_API_KEY is set in environment for integration library
if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]

# Model Configurations
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")

# Set to True to use local HuggingFace embeddings instead of Google API embeddings (saves Gemini API quota)
USE_LOCAL_EMBEDDINGS = os.getenv("USE_LOCAL_EMBEDDINGS", "true").lower() == "true"

# Vector Store local save path
VECTOR_STORE_PATH = os.path.join(AI_DIR, os.getenv("VECTOR_STORE_PATH", "faiss_index"))

import sys

if not GEMINI_API_KEY:
    print("[WARNING] GOOGLE_API_KEY is not set. Please add it to your server/.env file.", file=sys.stderr)
