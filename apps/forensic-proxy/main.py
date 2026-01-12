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

    opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'force_ipv4': True, # Force IPv4 as IPv6 ranges are often blocked
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios'], # Mobile only, no Web
                'player_skip': ['webpage', 'configs', 'js'],
                'include_fields': ['title', 'thumbnail', 'duration', 'uploader', 'view_count', 'url'],
            },
        },
    }

    # Nuclear Option: Cookies from Environment Variable
    # If YOUTUBE_COOKIES is set (Netscape format content), write it to a file.
    import os
    if os.environ.get("YOUTUBE_COOKIES"):
        with open("cookies.txt", "w") as f:
            f.write(os.environ["YOUTUBE_COOKIES"])
        opts['cookiefile'] = "cookies.txt"
    
    return opts

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
