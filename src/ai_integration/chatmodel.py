import sys
# Redirect all standard output prints to stderr immediately to avoid polluting stdout
original_stdout = sys.stdout
sys.stdout = sys.stderr

import os
import re
import json
import pdfplumber
from docx import Document
from PIL import Image
import pytesseract

# Import modular components
import config
from em_model import embeddings_model
import vector_store_manager as vs_manager
import career_agent as agent
from formatter import format_for_frontend

# ---------------- DOCUMENT EXTRACTION ----------------
def extract_text(file_path: str) -> str:
    """
    Extracts text from PDF, DOCX, and image formats.
    """
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    try:
        if ext == ".pdf":
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text(layout=True)
                    if page_text: text += page_text + "\n"
        elif ext == ".docx":
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext in [".png", ".jpg", ".jpeg"]:
            text = pytesseract.image_to_string(Image.open(file_path), config='--psm 1')
    except Exception as e:
        sys.stderr.write(f"[ChatModel Extractor Error]: {e}\n")
    return text[:10000]

def parse_stdin_input(raw_input: str):
    """
    Parses structural text inputs passing through Node's child process.
    Detects and extracts Chat History, File Paths, and the current message content.
    """
    history = []
    user_message = raw_input
    file_path = None
    
    # Check for chat history block structure
    if "CHAT HISTORY:" in raw_input and ("CURRENT REQUEST:" in raw_input or "CURRENT_REQUEST:" in raw_input):
        parts = re.split(r'CURRENT REQUEST:|CURRENT_REQUEST:', raw_input, maxsplit=1)
        history_part = parts[0].replace("CHAT HISTORY:", "").strip()
        current_part = parts[1].strip() if len(parts) > 1 else ""
        
        for line in history_part.split("\n"):
            line = line.strip()
            if line.startswith("USER:"):
                history.append({"role": "user", "content": line[5:].strip()})
            elif line.startswith("ASSISTANT:"):
                history.append({"role": "assistant", "content": line[10:].strip()})
            elif line.startswith("SYSTEM:"):
                history.append({"role": "system", "content": line[7:].strip()})
                
        user_message = current_part
    
    # Check for file path patterns
    if "FILE_PATH:" in user_message:
        path_match = re.search(r'FILE_PATH:(.*?)\|\|\|', user_message)
        if path_match:
            file_path = path_match.group(1).strip()
            user_message = user_message.split("|||", 1)[1] if "|||" in user_message else "Analyze this resume."
            
    return history, user_message, file_path

# ---------------- MAIN ----------------
if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            sys.exit(0)

        # Parse history and message
        history, user_message, file_path = parse_stdin_input(raw_input)

        # FAST PATH: Instant greetings for empty history
        # (Saves API tokens and ensures instant responses for simple hellos)
        if not history and user_message.lower().strip() in ["hi", "hello", "hey"]:
            print(json.dumps({"response": "Hello! I'm your Alumni Connect AI. How can I help you with your career today?"}), flush=True)
            sys.exit(0)

        # Debug logging to stderr to trace execution on Render
        sys.stderr.write(f"[ChatModel] Parsed file_path: '{file_path}'\n")
        if file_path:
            sys.stderr.write(f"[ChatModel] File exists on disk: {os.path.exists(file_path)}\n")

        # SCENARIO 1: Resume File Analysis
        if file_path and os.path.exists(file_path):
            sys.stderr.write("[ChatModel] Entering Scenario 1: Resume File Analysis\n")
            file_content = extract_text(file_path)
            sys.stderr.write(f"[ChatModel] Extracted text length: {len(file_content)}\n")
            raw_response = agent.analyze_resume(file_content, user_message)
            formatted_response = format_for_frontend(raw_response)
            
        # SCENARIO 2: Chat with RAG / general career Q&A
        else:
            sys.stderr.write("[ChatModel] Entering Scenario 2: Chat with RAG / general career Q&A\n")
            # Check cache to save API requests and time
            from cache_manager import get_cached_response, set_cached_response
            cached = get_cached_response(user_message)
            
            if cached:
                sys.stderr.write(f"[Cache] Serving cached response for query: '{user_message.strip()}'\n")
                formatted_response = cached
            else:
                # Load embeddings and vector store database
                embeddings = embeddings_model()
                vector_store = None
                
                # Attempt to load local vector index files
                index_file = os.path.join(config.VECTOR_STORE_PATH, "index.faiss")
                if os.path.exists(index_file):
                    try:
                        vector_store = vs_manager.load_vector_store(config.VECTOR_STORE_PATH, embeddings)
                    except Exception as e:
                        sys.stderr.write(f"[ChatModel] Warning loading FAISS index: {e}\n")
                
                # If database vector store is loaded, query context
                retrieved_context = ""
                if vector_store:
                    try:
                        retriever = vs_manager.get_retriever(vector_store, top_k=3, search_type="mmr")
                        matched_docs = retriever.invoke(user_message)
                        
                        context_parts = []
                        for i, doc in enumerate(matched_docs):
                            source = doc.metadata.get("source", "Unknown Source")
                            context_parts.append(f"[Context Chunk {i+1} from {source}]:\n{doc.page_content}")
                        retrieved_context = "\n\n".join(context_parts)
                    except Exception as e:
                        sys.stderr.write(f"[ChatModel] Similarity search failed: {e}\n")
                
                # Delegate generation to career agent
                if retrieved_context.strip():
                    raw_response = agent.chat_with_knowledge(user_message, retrieved_context, history)
                else:
                    raw_response = agent.chat_without_knowledge(user_message, history)
                    
                formatted_response = format_for_frontend(raw_response)
                
                # Cache the successfully generated response
                set_cached_response(user_message, formatted_response)

        # Return structured response payload
        sys.stdout = original_stdout
        print(json.dumps({"response": str(formatted_response).strip()}), flush=True)

    except Exception as e:
        sys.stdout = original_stdout
        print(json.dumps({"error": str(e)}), flush=True)
