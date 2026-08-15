FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    python-multipart \
    transformers \
    azure-storage-blob \
    Pillow \
    av

ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1

COPY src/ src/

EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
