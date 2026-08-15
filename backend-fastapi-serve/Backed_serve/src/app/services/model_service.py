import gc
import io
import logging
import os
import tempfile
import threading
import time
import torch
from PIL import Image
from torchvision import transforms
from transformers import ViTForImageClassification, ViTImageProcessor, ViTConfig
from azure.storage.blob import BlobServiceClient

cpu_threads = os.cpu_count() or 4
torch.set_num_threads(cpu_threads)
torch.set_num_interop_threads(max(1, cpu_threads // 2))

from app.config import (
    AZURE_STORAGE_CONNECTION_STRING, AZURE_CONTAINER_NAME, BLOB_NAME,
    MODEL_NAME, IMAGE_SIZE, NUM_CLASSES, LABEL_NAMES,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10


class ModelService:
    def __init__(self):
        self.model = None
        self.transform = None
        self.device = None
        self.ready = False
        self.loading = False
        self.error: str | None = None
        self.load_stage: str = "idle"
        self.retry_count: int = 0
        self.load_start_time: float | None = None

    @property
    def is_ready(self) -> bool:
        return self.ready and self.model is not None

    def load_in_background(self):
        if self.loading:
            return
        self.loading = True
        self.error = None
        thread = threading.Thread(target=self._load_with_retry, daemon=True)
        thread.start()

    def retry_load(self) -> bool:
        if self.loading:
            return False
        self.ready = False
        self.model = None
        self.error = None
        self.retry_count = 0
        self.load_in_background()
        return True

    def _download_from_blob(self) -> str:
        logger.info("Downloading model from Azure Blob: %s/%s...", AZURE_CONTAINER_NAME, BLOB_NAME)
        blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        blob_client = blob_service.get_blob_client(container=AZURE_CONTAINER_NAME, blob=BLOB_NAME)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pt")
        download_stream = blob_client.download_blob()
        download_stream.readinto(tmp)
        tmp.close()

        size_mb = blob_client.get_blob_properties().size / (1024 * 1024)
        logger.info("Downloaded %.1f MB to %s", size_mb, tmp.name)
        return tmp.name

    def _load_with_retry(self):
        for attempt in range(1, MAX_RETRIES + 1):
            self.retry_count = attempt
            logger.info("Load attempt %d/%d", attempt, MAX_RETRIES)
            success = self._load()
            if success:
                return
            if attempt < MAX_RETRIES:
                logger.info("Retrying in %ds...", RETRY_DELAY_SECONDS)
                time.sleep(RETRY_DELAY_SECONDS)
        self.loading = False
        logger.error("All %d load attempts failed. Last error: %s", MAX_RETRIES, self.error)

    def _load(self) -> bool:
        self.load_start_time = time.time()
        try:
            self.load_stage = "init"
            logger.info("PyTorch version: %s", torch.__version__)
            self.device = torch.device("cpu")

            self.load_stage = "blob_download"
            t = time.time()
            model_path = self._download_from_blob()
            logger.info("[STAGE] blob_download took %.1fs", time.time() - t)

            self.load_stage = "config_download"
            t = time.time()
            config = ViTConfig.from_pretrained(MODEL_NAME, num_labels=NUM_CLASSES)
            logger.info("[STAGE] config_download took %.1fs", time.time() - t)

            self.load_stage = "model_load"
            t = time.time()
            model = ViTForImageClassification(config)
            # Use mmap=True (PyTorch 2.1+) to avoid loading entire state dict into RAM
            # Falls back to standard load for older versions
            try:
                state_dict = torch.load(
                    model_path, map_location="cpu", weights_only=True, mmap=True
                )
            except TypeError:
                state_dict = torch.load(
                    model_path, map_location="cpu", weights_only=True
                )
            model.load_state_dict(state_dict)
            del state_dict
            gc.collect()
            # Delete temp file immediately to free disk space
            try:
                os.unlink(model_path)
            except OSError:
                pass
            model.to(self.device)
            model.eval()
            logger.info("[STAGE] model_load took %.1fs", time.time() - t)

            self.load_stage = "processor_download"
            t = time.time()
            processor = ViTImageProcessor.from_pretrained(MODEL_NAME)
            self.transform = transforms.Compose([
                transforms.Resize(IMAGE_SIZE + 32),
                transforms.CenterCrop(IMAGE_SIZE),
                transforms.ToTensor(),
                transforms.Normalize(mean=processor.image_mean, std=processor.image_std),
            ])
            logger.info("[STAGE] processor_download took %.1fs", time.time() - t)

            self.model = model
            self.ready = True
            self.loading = False
            self.load_stage = "done"

            logger.info("Model loaded on %s (%.1fs total)", self.device, time.time() - self.load_start_time)
            return True

        except Exception as e:
            self.error = f"[{self.load_stage}] {e}"
            logger.error("Model loading failed at stage '%s': %s", self.load_stage, e, exc_info=True)
            return False

    def predict_image(self, image: Image.Image) -> dict:
        if image.mode != "RGB":
            image = image.convert("RGB")

        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.inference_mode():
            outputs = self.model(pixel_values=input_tensor)
            probs = torch.softmax(outputs.logits, dim=1)[0]
            pred_label = probs.argmax().item()

        return {
            "prediction": LABEL_NAMES[pred_label],
            "confidence": round(probs[pred_label].item(), 4),
            "fake_probability": round(probs[0].item(), 4),
            "real_probability": round(probs[1].item(), 4),
        }

    def predict_batch(self, images: list[Image.Image]) -> list[dict]:
        tensors = []
        for img in images:
            if img.mode != "RGB":
                img = img.convert("RGB")
            tensors.append(self.transform(img))

        batch = torch.stack(tensors).to(self.device)

        with torch.inference_mode():
            outputs = self.model(pixel_values=batch)
            all_probs = torch.softmax(outputs.logits, dim=1)

        results = []
        for probs in all_probs:
            pred_label = probs.argmax().item()
            results.append({
                "prediction": LABEL_NAMES[pred_label],
                "confidence": round(probs[pred_label].item(), 4),
                "fake_probability": round(probs[0].item(), 4),
                "real_probability": round(probs[1].item(), 4),
            })
        return results


model_service = ModelService()
