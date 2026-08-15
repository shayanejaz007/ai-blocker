import hmac
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.services.model_service import model_service
from app.routers.predict import router as predict_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server starting, launching model load in background...")
    model_service.load_in_background()
    yield
    logger.info("Server shutting down")


app = FastAPI(
    title="AI Content Detection API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Default to NO cross-origin access. All legitimate traffic comes server-to-
# server from the Next.js API (no CORS needed), so a wildcard here only helps
# attackers. Set ALLOWED_ORIGINS explicitly if a browser must call this API.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["POST", "GET"],
        allow_headers=["Content-Type", "X-API-Key"],
    )

# ── API key enforcement ──────────────────────────────────────────────────────
# The Next.js API forwards MODEL_API_KEY as X-API-Key. Without this check,
# anyone who discovers this server's URL can run unlimited free predictions
# and bypass the entire credit system.
MODEL_API_KEY = os.environ.get("MODEL_API_KEY", "")
PUBLIC_PATHS = {"/", "/health"}  # keep basic liveness public for Render health checks

if not MODEL_API_KEY:
    logger.warning(
        "MODEL_API_KEY is not set — /predict and admin endpoints are UNPROTECTED. "
        "Set MODEL_API_KEY in production."
    )


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if MODEL_API_KEY and request.url.path not in PUBLIC_PATHS and request.method != "OPTIONS":
        provided = request.headers.get("x-api-key", "")
        if not hmac.compare_digest(provided, MODEL_API_KEY):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


app.include_router(predict_router)


@app.get("/health")
async def health():
    if model_service.error:
        return {"status": "error", "model_loaded": False, "error": model_service.error}
    if model_service.is_ready:
        return {"status": "ok", "model_loaded": True}
    return {"status": "loading", "model_loaded": False}


@app.get("/health/detail")
async def health_detail():
    import time as _time
    elapsed = None
    if model_service.load_start_time:
        elapsed = round(_time.time() - model_service.load_start_time, 1)
    return {
        "status": "ok" if model_service.is_ready else ("error" if model_service.error else "loading"),
        "model_loaded": model_service.is_ready,
        "current_stage": model_service.load_stage,
        "retry_count": model_service.retry_count,
        "elapsed_seconds": elapsed,
        "error": model_service.error,
        "device": str(model_service.device) if model_service.device else None,
    }


@app.post("/health/retry")
async def health_retry():
    started = model_service.retry_load()
    if not started:
        return {"message": "Model is already loading, please wait"}
    return {"message": "Model reload triggered"}


@app.get("/")
async def root():
    return {"status": "ok", "model_loaded": model_service.is_ready}
