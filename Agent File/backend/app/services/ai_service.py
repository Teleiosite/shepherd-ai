"""AI Service for generating content using multiple AI providers."""
import google.generativeai as genai
from app.config import settings
from typing import Optional, List
import httpx


async def generate_message(
    contact_name: str,
    contact_category: str,
    context: str,
    tone: str = "encouraging",
    sender_name: str = "Pastor",
    organization_name: str = "Church",
    ai_provider: str = "gemini",
    ai_api_key: Optional[str] = None,
    ai_model: str = "gemini-2.0-flash",
    ai_base_url: Optional[str] = None
) -> str:
    """
    Generate a personalized message for a contact using configured AI provider.
    
    Args:
        contact_name: Name of the recipient
        contact_category: Category (e.g. New Convert)
        context: Context from knowledge base or situation
        tone: Desired tone of the message
        sender_name: Name of the sender
        organization_name: Name of the church/org
        ai_provider: AI provider (gemini, openai, deepseek, groq, custom)
        ai_api_key: API key for the AI provider
        ai_model: Model name to use
        ai_base_url: Base URL for custom providers
        
    Returns:
        Generated message text
    """
    
    # Fallback to environment variable if no API key provided
    if not ai_api_key:
        ai_api_key = settings.gemini_api_key
    
    if not ai_api_key:
        return "Please configure your AI Provider API Key in Settings."
    
    prompt = f"""
    You are {sender_name}, a leader at {organization_name}.
    Write a short, personal, and {tone} WhatsApp message to {contact_name}, who is a {contact_category}.
    
    CONTEXT/GOAL:
    {context}
    
    GUIDELINES:
    - Keep it under 50 words
    - Be warm and personal
    - Use 1-2 emojis
    - Do not include subject lines or placeholders
    - End with "- {sender_name}"
    """
    
    try:
        if ai_provider == "gemini":
            # Use Google Gemini
            genai.configure(api_key=ai_api_key)
            model = genai.GenerativeModel(ai_model)
            response = model.generate_content(prompt)
            return response.text.strip()
        else:
            # Use OpenAI-compatible API (OpenAI, DeepSeek, Groq, Custom)
            base_url = ai_base_url
            if not base_url:
                if ai_provider == "openai":
                    base_url = "https://api.openai.com/v1"
                elif ai_provider == "deepseek":
                    base_url = "https://api.deepseek.com"
                elif ai_provider == "groq":
                    base_url = "https://api.groq.com/openai/v1"
                else:
                    raise ValueError(f"Unknown provider: {ai_provider}")
            
            base_url = base_url.rstrip('/')
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {ai_api_key}"
                    },
                    json={
                        "model": ai_model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7
                    },
                    timeout=30.0
                )
                
                if not response.is_success:
                    raise Exception(f"AI API Error: {response.text}")
                
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
                
    except Exception as e:
        print(f"Error generating message: {e}")
        return f"Hi {contact_name}, thinking of you today! - {sender_name}"


async def generate_embedding(text: str, api_key: Optional[str] = None) -> List[float]:
    """
    Generate vector embedding for text using Gemini.
    
    Args:
        text: Text to embed
        api_key: Optional API key (falls back to env var)
        
    Returns:
        List of floats representing the embedding vector
    """
    if not api_key:
        api_key = settings.gemini_api_key
        
    if not api_key:
        print("No API key available for embeddings")
        return []
        
    try:
        genai.configure(api_key=api_key)
        # Use the embedding model
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title="Shepherd AI Knowledge"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []
