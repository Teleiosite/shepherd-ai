from fastapi import APIRouter, Query, Depends, HTTPException
import httpx
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import re

from app.dependencies import get_current_user
from app.models.user import User
from app.utils.security_utils import is_safe_url

router = APIRouter()


@router.get("/")
async def browse_url(
    q: str = Query(..., description="Query or URL to browse"),
    current_user: User = Depends(get_current_user)
):
    """Scrape DuckDuckGo search or a direct URL and return a text summary (Authenticated & SSRF protected)."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    # Check if direct URL or search query
    if q.startswith("http://") or q.startswith("https://"):
        url = q
    else:
        # Search query -> use DuckDuckGo HTML search
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(q)}"

    # SSRF Protection: Validate target URL against private/internal IP address spaces
    safe, reason = is_safe_url(url)
    if not safe:
        raise HTTPException(status_code=400, detail=f"SSRF Protection: {reason}")

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code != 200:
            return {"error": f"Failed to retrieve content (status {resp.status_code})"}

        soup = BeautifulSoup(resp.text, "html.parser")
        
        # If DDG search results page
        if "duckduckgo.com" in url:
            links = []
            for a in soup.find_all("a", class_="result__snippet")[:3]:
                links.append(a.get_text(strip=True))
            summary = "\n".join(links)
            return {"summary": summary or "No search results found."}
            
        # Standard web page -> extract paragraphs
        paragraphs = []
        for p in soup.find_all("p")[:8]:
            text = p.get_text(strip=True)
            if len(text) > 20:
                paragraphs.append(text)
                
        content = "\n\n".join(paragraphs)
        clean = re.sub(r'\s+', ' ', content)[:1500]
        
        return {"content": clean or "No text content found on page."}
        
    except Exception as e:
        return {"error": str(e)}
