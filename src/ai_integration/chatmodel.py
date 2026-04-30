import sys
import os
import re
import json
import pdfplumber
from docx import Document
from PIL import Image
import pytesseract
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI

# ---------------- DOCUMENT EXTRACTION ----------------
def extract_text(file_path: str) -> str:
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
    except:
        pass
    return text[:10000]

# ---------------- PROMPTS ----------------
RESUME_PROMPT = """
You are the Alumni Connect "Career Architect". 

TASK: Deeply analyze the resume content. 
1. Extract EXACT Skills, Experience, Projects, and Education.
2. Provide strategic advice for career growth.
3. Use a professional, human-like tone.

OUTPUT:
## 📄 Candidate Profile
- **Skills**:
- **Experience**:
- **Projects**:
- **Education**:

## 💡 Strategy & Fixes
- **Strengths**:
- **Weaknesses**:
- **Top 3 Improvements**:
"""

CHAT_PROMPT = """
You are Alumni Connect AI, a helpful and friendly career assistant. 
- Be conversational, not robotic. 
- Help with jobs, education, and networking.
- If greeting -> keep it very brief.
"""

# ---------------- HELPERS ----------------
def get_llm(is_detailed=False):
    # Check for Gemini API key first
    api_key = os.environ.get("GOOGLE_API_KEY")
    if api_key and api_key != "your_api_key_here":
        return ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite-preview",
            google_api_key=api_key,
            temperature=0.2 if is_detailed else 0.8,
            max_output_tokens=768 if is_detailed else 256,
        )
    
    # Fallback to Ollama
    return ChatOllama(
        model="llama3.2:3b",
        base_url="http://localhost:11434",
        temperature=0.2 if is_detailed else 0.8,
        num_ctx=4096 if is_detailed else 2048,
        num_predict=768 if is_detailed else 128,
    )

def is_resume_intent(text: str):
    keywords = ["resume", "cv", "experience", "projects", "skills", "analysis", "education", "job"]
    return any(kw in text.lower() for kw in keywords)

# ---------------- MAIN ----------------
if __name__ == "__main__":
    # Ensure Google API Key is set if provided in environment
    if "GOOGLE_API_KEY" not in os.environ:
        os.environ["GOOGLE_API_KEY"] = "your_api_key_here"

    try:
        raw_input = sys.stdin.read().strip()
        if not raw_input: sys.exit(0)

        # FAST PATH: Instant greeting
        if raw_input.lower().strip() in ["hi", "hello", "hey"]:
            print(json.dumps({"response": "Hello! I'm your Alumni Connect AI. How can I help you with your career today?"}), flush=True)
            sys.exit(0)

        file_path = None
        user_message = raw_input
        if "FILE_PATH:" in raw_input:
            path_match = re.search(r'FILE_PATH:(.*?)\|\|\|', raw_input)
            if path_match:
                file_path = path_match.group(1).strip()
                user_message = raw_input.split("|||", 1)[1] if "|||" in raw_input else "Analyze this resume."

        response_text = ""

        # SCENARIO 1: Resume File
        if file_path and os.path.exists(file_path):
            content = extract_text(file_path)
            llm = get_llm(is_detailed=True)
            response = llm.invoke([
                {"role": "system", "content": RESUME_PROMPT},
                {"role": "user", "content": f"CONTENT:\n{content}\n\nREQUEST: {user_message}"}
            ])
            response_text = response.content

        # SCENARIO 2: Resume/Career Query
        elif is_resume_intent(user_message):
            llm = get_llm(is_detailed=True)
            response = llm.invoke([
                {"role": "system", "content": "You are a career strategist. Help the user with their career-related query."},
                {"role": "user", "content": user_message}
            ])
            response_text = response.content

        # SCENARIO 3: Normal Chat
        else:
            llm = get_llm(is_detailed=False)
            response = llm.invoke([
                {"role": "system", "content": CHAT_PROMPT},
                {"role": "user", "content": user_message}
            ])
            response_text = response.content

        if isinstance(response_text, list):
            response_text = "".join([str(part.get("text", part)) if isinstance(part, dict) else str(part) for part in response_text])
            
        print(json.dumps({"response": str(response_text).strip()}), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
