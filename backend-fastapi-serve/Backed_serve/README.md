# AI Content Detection API

FastAPI service that detects AI-generated images and videos using ViT-Large.

Base image: `pytorch/pytorch:2.5.1-cuda12.1-cudnn9-runtime` (torch + torchvision with CUDA pre-installed).
Additional deps installed via pip (no uv venv, no torch reinstall).

Model loads in background after server starts so Azure health probes pass immediately.

## Build & Push to Azure Container Registry

```bash
az login
az acr login --name aicontentblocker
docker build --no-cache -t ai-content-api .
TAG=$(date +'%d-%b-%H-%M' | tr '[:upper:]' '[:lower:]')
docker tag ai-content-api aicontentblocker.azurecr.io/ai-content-api:$TAG
docker push aicontentblocker.azurecr.io/ai-content-api:$TAG
```

## Deploy to Azure Container Apps

```bash
az containerapp update \
  --name backend-content-generation-ai \
  --resource-group "AI Content Blocker" \
  --image aicontentblocker.azurecr.io/ai-content-api:$TAG \
  --min-replicas 1 \
  --set-env-vars HF_TOKEN=<your_hf_token>
```

Check logs:

```bash
az containerapp logs show \
  --name backend-content-generation-ai \
  --resource-group "AI Content Blocker" \
  --type console
```

## Local Run

```bash
docker build --no-cache -t ai-content-api .
docker run -p 8000:8000 --gpus all ai-content-api
```

## API

- `GET /` -- root status
- `GET /health` -- returns `{"status": "loading"}` during warmup, `{"status": "ok"}` when ready
- `POST /predict` -- upload image or video file (returns 503 while model is loading)

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict -F "file=@test_image.jpg"
```
