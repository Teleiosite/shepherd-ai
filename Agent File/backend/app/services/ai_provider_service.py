"""
AI Provider Service
Tests and validates AI API keys before saving
"""

import httpx
import google.generativeai as genai
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class AIProviderService:
    """Service for testing AI provider credentials"""
    
    async def test_gemini(self, api_key: str, model: str = "gemini-pro") -> Dict[str, Any]:
        """Test Google Gemini API key"""
        try:
            genai.configure(api_key=api_key)
            model_instance = genai.GenerativeModel(model)
            response = model_instance.generate_content("Respond with exactly: OK")
            
            return {
                "success": True,
                "provider": "gemini",
                "message": "API key is valid",
                "response": response.text[:100]
            }
        except Exception as e:
            logger.error(f"Gemini API test failed: {str(e)}")
            return {
                "success": False,
                "provider": "gemini",
                "error": str(e)
            }
    
    async def test_openai(self, api_key: str, model: str = "gpt-3.5-turbo") -> Dict[str, Any]:
        """Test OpenAI API key"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "Respond with exactly: OK"}],
                        "max_tokens": 10
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": "openai",
                        "message": "API key is valid"
                    }
                else:
                    return {
                        "success": False,
                        "provider": "openai",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"OpenAI API test failed: {str(e)}")
            return {
                "success": False,
                "provider": "openai",
                "error": str(e)
            }
    
    async def test_deepseek(self, api_key: str, base_url: str = "https://api.deepseek.com/v1") -> Dict[str, Any]:
        """Test DeepSeek API key"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [{"role": "user", "content": "Respond with exactly: OK"}],
                        "max_tokens": 10
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": "deepseek",
                        "message": "API key is valid"
                    }
                else:
                    return {
                        "success": False,
                        "provider": "deepseek",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"DeepSeek API test failed: {str(e)}")
            return {
                "success": False,
                "provider": "deepseek",
                "error": str(e)
            }
    
    async def test_groq(self, api_key: str) -> Dict[str, Any]:
        """Test Groq API key"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama2-70b-4096",
                        "messages": [{"role": "user", "content": "Respond with exactly: OK"}],
                        "max_tokens": 10
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": "groq",
                        "message": "API key is valid"
                    }
                else:
                    return {
                        "success": False,
                        "provider": "groq",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Groq API test failed: {str(e)}")
            return {
                "success": False,
                "provider": "groq",
                "error": str(e)
            }
    
    async def test_custom(self, api_key: str, base_url: str) -> Dict[str, Any]:
        """Test custom OpenAI-compatible API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "default",
                        "messages": [{"role": "user", "content": "Respond with exactly: OK"}],
                        "max_tokens": 10
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": "custom",
                        "message": "API key is valid"
                    }
                else:
                    return {
                        "success": False,
                        "provider": "custom",
                        "error": f"HTTP {response.status_code}: {response.text}"
                    }
        except Exception as e:
            logger.error(f"Custom API test failed: {str(e)}")
            return {
                "success": False,
                "provider": "custom",
                "error": str(e)
            }
    
    async def test_provider(self, provider: str, api_key: str, model: str = None, base_url: str = None) -> Dict[str, Any]:
        """Test any AI provider credentials"""
        if provider == "gemini":
            return await self.test_gemini(api_key, model or "gemini-pro")
        elif provider == "openai":
            return await self.test_openai(api_key, model or "gpt-3.5-turbo")
        elif provider == "deepseek":
            return await self.test_deepseek(api_key, base_url or "https://api.deepseek.com/v1")
        elif provider == "groq":
            return await self.test_groq(api_key)
        elif provider == "custom" and base_url:
            return await self.test_custom(api_key, base_url)
        else:
            return {
                "success": False,
                "provider": provider,
                "error": "Unsupported provider or missing base_url for custom provider"
            }


# Singleton instance
ai_provider_service = AIProviderService()
