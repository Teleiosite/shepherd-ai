"""AI Service for generating content using Google Gemini."""
import google.generativeai as genai
from app.config import settings
from typing import Optional, List

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)

# Initialize model
model = genai.GenerativeModel('gemini-2.0-flash')


async def generate_message(
    contact_name: str,
    contact_category: str,
    context: str,
    tone: str = "encouraging",
    sender_name: str = "Pastor",
    organization_name: str = "Church"
) -> str:
    """
    Generate a personalized message for a contact.
    
    Args:
        contact_name: Name of the recipient
        contact_category: Category (e.g. New Convert)
        context: Context from knowledge base or situation
        tone: Desired tone of the message
        sender_name: Name of the sender
        organization_name: Name of the church/org
        
    Returns:
        Generated message text
    """
    
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
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating message: {e}")
        return f"Hi {contact_name}, thinking of you today! - {sender_name}"


async def generate_embedding(text: str) -> List[float]:
    """
    Generate vector embedding for text using Gemini.
    
    Args:
        text: Text to embed
        
    Returns:
        List of floats representing the embedding vector
    """
    try:
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
