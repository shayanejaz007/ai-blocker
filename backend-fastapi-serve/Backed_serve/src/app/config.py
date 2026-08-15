import os

MODEL_NAME = "google/vit-large-patch16-224"
IMAGE_SIZE = 224
NUM_CLASSES = 2
LABEL_NAMES = {0: "Fake", 1: "Real"}

AZURE_STORAGE_CONNECTION_STRING = os.environ.get(
    "AZURE_STORAGE_CONNECTION_STRING",
    ""  # Set via environment variable — never hardcode
)
AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER_NAME", "model")
BLOB_NAME = os.environ.get("AZURE_BLOB_NAME", "phase2_best_model.pt")