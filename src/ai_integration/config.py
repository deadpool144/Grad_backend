import os
from pathlib import Path
import dotenv
import sys

# Resolve paths relative to this directory
AI_DIR = Path(__file__).resolve().parent
BASE_DIR = AI_DIR.parent.parent  # server/src/ai_integration -> server
ENV_PATH = BASE_DIR / ".env"

# Load the environment variables
if ENV_PATH.exists():
    dotenv.load_dotenv(dotenv_path=ENV_PATH)
else:
    dotenv.load_dotenv()

# Read key values (supports both GOOGLE_API_KEY and GEMINI_API_KEY)
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

# Ensure it is set in environment for integration library defaults
if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
else:
    print("[WARNING] GOOGLE_API_KEY is not set. Please add it to your server/.env file.", file=sys.stderr)

# ── Model Names ──────────────────────────────────────────────────────────────
# Chat/generation model
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Embedding model — text-embedding-004 is the current stable Google embedding model
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")

# Always use Google Gemini API embeddings (API-based, no local model loading / no PyTorch OOM)
USE_LOCAL_EMBEDDINGS = False

# ── Paths ────────────────────────────────────────────────────────────────────
# Vector Store local save path
VECTOR_STORE_PATH = os.path.join(AI_DIR, os.getenv("VECTOR_STORE_PATH", "faiss_index"))
