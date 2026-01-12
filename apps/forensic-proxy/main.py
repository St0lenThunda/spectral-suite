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

# CORS - Allow all for now (Forensic Tooling is open)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_best_audio_url(video_url: str) -> str:
    """
    Extracts the best available audio stream URL using yt-dlp.
    """
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        # 'cookiefile': 'cookies.txt', # If needed for age-restricted
    }

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
