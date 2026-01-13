from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp
import logging
import io
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forensic-proxy")

app = FastAPI(title="Spectral Suite Forensic Proxy")

# DEBUG: Print loaded yt-dlp version
try:
    import yt_dlp.version
    logger.info(f"Loaded yt-dlp version: {yt_dlp.version.__version__}")
except:
    logger.info("Could not determine yt-dlp version")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# DEBUG: Log every request
class LogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming Request: {request.method} {request.url}")
        try:
            response = await call_next(request)
            # PNA Header (Private Network Access) debugging
            response.headers["Access-Control-Allow-Private-Network"] = "true"
            return response
        except Exception as e:
            logger.error(f"Middleware Error: {e}")
            raise e

app.add_middleware(LogMiddleware)

# CORS - Explicitly allow local dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex='https?://.*', # Allow any http/https origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_best_audio_url(video_url: str) -> str:
    """
    Extracts the best available audio stream URL using yt-dlp.
    """


def get_ydl_opts():
    """
    Returns robust yt-dlp options to bypass bot detection.
    Using 'android' client is often more permissive for datacenter IPs.
    """

    # Smart Client Selection
    # If Cookies are present, 'web' client is safest and most reliable.
    # If NO Cookies, 'android/ios' + IPv4 is the best evasion strategy.
    
    import os
    has_cookies = False
    
    # Mimic a real Mobile Safari session
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Mode': 'navigate',
    }

    if os.environ.get("YOUTUBE_COOKIES"):
        logger.info("Found YOUTUBE_COOKIES env var. Using WEB client strategy.")
        has_cookies = True
        with open("cookies.txt", "w") as f:
            f.write(os.environ["YOUTUBE_COOKIES"])
    else:
        logger.info("No YOUTUBE_COOKIES found. Using MOBILE client evasion strategy.")

    base_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'http_headers': headers,
    }

    if has_cookies:
        # Authenticated Strategy (Web Client)
        base_opts.update({
            'cookiefile': 'cookies.txt',
            'extractor_args': {
                'youtube': {
                    'player_client': ['web'],
                    'player_skip': ['configs', 'js'],
                },
            },
        })
    else:
        # Unauthenticated Evasion Strategy (Mobile Clients + IPv4)
        base_opts.update({
            'force_ipv4': True, 
            'extractor_args': {
                'youtube': {
                    'player_client': ['ios', 'android'], 
                    'player_skip': ['webpage', 'configs', 'js'],
                },
            },
        })
    
    return base_opts

def get_best_audio_url(video_url: str) -> str:
    """
    Extracts the best available audio stream URL using yt-dlp.
    """
    ydl_opts = get_ydl_opts()

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if 'url' in info:
                return info['url']
            else:
                raise Exception("No direct URL found")
    except Exception as e:
        logger.error(f"yt-dlp error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to extract audio: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "operational", "service": "forensic-proxy"}

@app.get("/info")
def get_video_info(url: str = Query(..., description="YouTube URL to inspect")):
    """
    Returns metadata for a YouTube video (Title, Duration, Thumbnail) without downloading.
    """
    ydl_opts = get_ydl_opts()
    ydl_opts['ignoreerrors'] = True # Don't fail completely on minor metadata issues
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get('title', 'Unknown Title'),
                "thumbnail": info.get('thumbnail'),
                "duration": info.get('duration'),
                "uploader": info.get('uploader'),
                "view_count": info.get('view_count')
            }
    except Exception as e:
        logger.error(f"Info extraction failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch info: {str(e)}")

@app.get("/resolve")
def resolve_audio(url: str = Query(..., description="YouTube URL to resolve")):
    """
    Proxies the audio stream from YouTube to the client.
    """
    if "youtube.com" not in url and "youtu.be" not in url:
         raise HTTPException(status_code=400, detail="Only YouTube URLs are supported currently.")

    logger.info(f"Resolving: {url}")
    
    try:
        # 1. Get the actual stream URL
        stream_url = get_best_audio_url(url)
        logger.info(f"Stream URL obtained. piping content...")

        # 2. Stream the content back to the client
        # We use requests with stream=True to avoid loading the whole file into memory
        external_req = requests.get(stream_url, stream=True)
        
        return StreamingResponse(
            external_req.iter_content(chunk_size=32 * 1024),
            media_type="audio/mpeg", # Often defaults to webm/opus, but browser handles it generic
            headers={
                "Content-Disposition": f'attachment; filename="forensic-audio.mp3"',
            }
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Resolution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
