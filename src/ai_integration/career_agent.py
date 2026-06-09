from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import config

def get_llm(temperature=0.2):
    """
    Initializes and returns the ChatGoogleGenerativeAI model.
    """
    api_key = config.GEMINI_API_KEY
    if not api_key or api_key == "your_api_key_here" or api_key.strip() == "":
        raise ValueError(
            "Missing GOOGLE_API_KEY environment variable. "
            "A valid Google API Key is required to run the Gemini models. "
            "Ollama fallback is disabled."
        )
    return ChatGoogleGenerativeAI(
        model=config.MODEL_NAME,
        google_api_key=api_key,
        temperature=temperature
    )

def analyze_resume(resume_text: str, user_message: str) -> str:
    """
    Extracts structured profiles and recommends career fixes from resume text.
    """
    llm = get_llm(temperature=0.1)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are the Alumni Connect \"Career Architect\".\n\n"
            "TASK: Deeply analyze the resume content.\n"
            "1. Extract EXACT Skills, Experience, Projects, and Education.\n"
            "2. Provide strategic advice for career growth.\n"
            "3. Use a professional, human-like tone.\n\n"
            "OUTPUT FORMAT:\n"
            "### 📄 Candidate Profile\n"
            "- **Skills**: [List extracted skills]\n"
            "- **Experience**: [Summary of experiences]\n"
            "- **Projects**: [Key projects and tech stacks]\n"
            "- **Education**: [Degrees and institutions]\n\n"
            "### 💡 Strategy & Fixes\n"
            "- **Strengths**: [Key candidate strengths]\n"
            "- **Weaknesses**: [Areas that need improvement]\n"
            "- **Top 3 Improvements**: [Actionable steps to improve their profile]"
        )),
        ("human", "Here is the candidate's resume content:\n\n{resume_content}\n\nUser instructions: {user_instruction}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    return chain.invoke({
        "resume_content": resume_text,
        "user_instruction": user_message
    })

def chat_with_knowledge(query: str, retrieved_context: str, chat_history: list = None) -> str:
    """
    Performs context-augmented Q&A chat about the platform or career advice.
    """
    llm = get_llm(temperature=0.7)
    
    history_messages = []
    if chat_history:
        for msg in chat_history[-10:]:
            role = msg.get("role", "user").lower()
            if role in ["assistant", "model", "ai"]:
                role = "ai"
            else:
                role = "human"
            history_messages.append((role, msg.get("content", "")))
            
    system_template = (
        "You are Alumni Connect AI, a helpful, conversational, and friendly career assistant.\n"
        "You have access to a knowledge base containing specific information about the Alumni Connect platform guidelines, career strategies, and networking rules.\n\n"
        "Here is the retrieved context from our knowledge base:\n"
        "------------------------\n"
        "{context}\n"
        "------------------------\n\n"
        "INSTRUCTIONS:\n"
        "1. Answer the user's question using the retrieved context above as much as possible.\n"
        "2. If the context does not contain the answer, use your pre-trained knowledge to answer, but prioritize the provided context.\n"
        "3. Keep your tone professional, friendly, and conversational.\n"
        "4. Keep the message concise and easy to read.\n"
        "5. Use markdown for structure (headings, lists, bold text)."
    )
    
    messages = [("system", system_template)]
    messages.extend(history_messages)
    messages.append(("human", "{user_query}"))
    
    prompt = ChatPromptTemplate.from_messages(messages)
    chain = prompt | llm | StrOutputParser()
    
    return chain.invoke({
        "context": retrieved_context,
        "user_query": query
    })

def chat_without_knowledge(query: str, chat_history: list = None) -> str:
    """
    Default Q&A assistant fallback when no custom knowledge documents are matched.
    """
    llm = get_llm(temperature=0.7)
    
    history_messages = []
    if chat_history:
        for msg in chat_history[-10:]:
            role = msg.get("role", "user").lower()
            if role in ["assistant", "model", "ai"]:
                role = "ai"
            else:
                role = "human"
            history_messages.append((role, msg.get("content", "")))
            
    system_template = (
        "You are Alumni Connect AI, a helpful and friendly career assistant.\n"
        "- Be conversational, not robotic.\n"
        "- Help with jobs, education, and networking.\n"
        "- If greeting -> keep it very brief."
    )
    
    messages = [("system", system_template)]
    messages.extend(history_messages)
    messages.append(("human", "{user_query}"))
    
    prompt = ChatPromptTemplate.from_messages(messages)
    chain = prompt | llm | StrOutputParser()
    
    return chain.invoke({
        "user_query": query
    })
