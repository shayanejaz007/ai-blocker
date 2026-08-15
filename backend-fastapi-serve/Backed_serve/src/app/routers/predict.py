import os
import io
import logging
import math
import time
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError

# Decompression-bomb protection: reject images that would decode to more than
# ~50 megapixels instead of letting Pillow allocate unbounded memory.
Image.MAX_IMAGE_PIXELS = 50_000_000

from app.services.model_service import model_service
from app.utils.video import extract_frames

logger = logging.getLogger(__name__)

router = APIRouter()

SOFTMAX_TEMPERATURE = 0.25
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".webm", ".mkv", ".flv", ".wmv"}
BATCH_SIZE = 4


def _softmax_weights(values: list[float], temperature: float = SOFTMAX_TEMPERATURE) -> list[float]:
    scaled = [v / temperature for v in values]
    max_val = max(scaled)
    exps = [math.exp(v - max_val) for v in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def _get_file_type(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[1]
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    return "unknown"


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not model_service.is_ready:
        raise HTTPException(status_code=503, detail="Model is still loading, try again shortly")

    request_start = time.time()
    filename = file.filename or "upload.bin"
    file_type = _get_file_type(filename)

    if file_type == "unknown":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Accepted: {sorted(IMAGE_EXTENSIONS | VIDEO_EXTENSIONS)}",
        )

    contents = await file.read()
    file_size_kb = len(contents) / 1024
    MAX_FILE_SIZE_MB = 100
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max allowed: {MAX_FILE_SIZE_MB}MB")
    logger.info("[%s] Received: %s | Size: %.1f KB | Content-Type: %s", file_type.upper(), filename, file_size_kb, file.content_type)

    if file_type == "image":
        result = await asyncio.to_thread(_handle_image, contents, filename)
        total_ms = (time.time() - request_start) * 1000
        logger.info(
            "[IMAGE] %s | Prediction: %s | Confidence: %.2f%% | Fake: %.2f%% | Real: %.2f%% | Latency: %.0fms",
            filename, result["prediction"], result["confidence"] * 100,
            result["fake_probability"] * 100, result["real_probability"] * 100, total_ms,
        )
        return result

    result = await _handle_video(contents, filename)
    total_ms = (time.time() - request_start) * 1000
    logger.info(
        "[VIDEO] %s | Prediction: %s | Confidence: %.2f%% | Fake: %.2f%% | Real: %.2f%% | Frames: %d | Latency: %.0fms",
        filename, result["prediction"], result["confidence"] * 100,
        result["fake_probability"] * 100, result["real_probability"] * 100,
        result["frames_analyzed"], total_ms,
    )
    return result


def _handle_image(contents: bytes, filename: str) -> dict:
    t0 = time.time()
    try:
        image = Image.open(io.BytesIO(contents))
        image.load()  # force full decode here so bombs/corruption fail fast
    except Image.DecompressionBombError:
        raise HTTPException(status_code=400, detail="Image too large to process")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file")
    logger.info("[IMAGE] %s | Decoded: %s %dx%d | Mode: %s", filename, image.format, image.width, image.height, image.mode)

    t1 = time.time()
    result = model_service.predict_image(image)
    inference_ms = (time.time() - t1) * 1000
    logger.info("[IMAGE] %s | Inference: %.0fms | Device: %s", filename, inference_ms, model_service.device)

    return {"type": "image", **result}


def _process_batch(frames: list[Image.Image], batch_idx: int) -> list[dict]:
    t0 = time.time()
    results = model_service.predict_batch(frames)
    ms = (time.time() - t0) * 1000
    fake_count = sum(1 for r in results if r["prediction"] == "Fake")
    real_count = len(results) - fake_count
    logger.info("[VIDEO] Batch %d: %d frames | Inference: %.0fms | Fake: %d | Real: %d", batch_idx, len(frames), ms, fake_count, real_count)
    return results


async def _handle_video(contents: bytes, filename: str) -> dict:
    file_size_mb = len(contents) / (1024 * 1024)
    logger.info("[VIDEO] %s | Size: %.1f MB | Starting frame extraction...", filename, file_size_mb)

    t0 = time.time()
    frames = await asyncio.to_thread(extract_frames, contents, 2)
    extract_ms = (time.time() - t0) * 1000

    if not frames:
        logger.warning("[VIDEO] %s | No frames extracted", filename)
        raise HTTPException(status_code=400, detail="No frames could be extracted from video")

    logger.info("[VIDEO] %s | Extracted %d frames in %.0fms | Processing in batches of %d", filename, len(frames), extract_ms, BATCH_SIZE)

    all_results = []
    for i in range(0, len(frames), BATCH_SIZE):
        batch_idx = i // BATCH_SIZE + 1
        batch = frames[i : i + BATCH_SIZE]
        batch_results = await asyncio.to_thread(_process_batch, batch, batch_idx)
        all_results.extend(batch_results)

    num_frames = len(all_results)
    fake_probs = [r["fake_probability"] for r in all_results]
    real_probs = [r["real_probability"] for r in all_results]

    weights = _softmax_weights(
        [max(fp, rp) for fp, rp in zip(fake_probs, real_probs)],
        temperature=0.25,
    )

    avg_fake = sum(w * fp for w, fp in zip(weights, fake_probs))
    avg_real = sum(w * rp for w, rp in zip(weights, real_probs))

    if avg_fake >= avg_real:
        prediction = "Fake"
        confidence = avg_fake
    else:
        prediction = "Real"
        confidence = avg_real

    logger.info(
        "[VIDEO] %s | Final: %s (%.2f%%) | Frames: %d | Weighted Fake: %.2f%% | Weighted Real: %.2f%%",
        filename, prediction, confidence * 100, num_frames, avg_fake * 100, avg_real * 100,
    )

    return {
        "type": "video",
        "prediction": prediction,
        "confidence": round(confidence, 4),
        "fake_probability": round(avg_fake, 4),
        "real_probability": round(avg_real, 4),
        "frames_analyzed": num_frames,
    }
