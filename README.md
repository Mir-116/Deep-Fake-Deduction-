# DeepFake Detection

A local-first web application that estimates whether an image may be AI-generated
or real. Upload an image, run it through the local inference backend, and review
the classification, raw score, decision threshold, and analysis report.

## Features

- Local image analysis through a FastAPI backend; no paid inference API key is required.
- JPG, JPEG, PNG, WEBP, and BMP image support.
- Image preview and file validation before analysis.
- Results with model score, configured threshold, input details, and report options.
- English and Urdu interface, with light and dark themes.

## Technology

- **Frontend:** Next.js 14, React 18, TypeScript, and Tailwind CSS.
- **Backend:** FastAPI and a locally cached Hugging Face image-classification model.
- **Image processing:** three 528px crops are scored for each input image.

## Run locally

Requirements: Python 3.10+ and Node.js 18.17+.

### 1. Start the backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

The backend health endpoint is available at
[http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

### 2. Start the frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and select **Analyze Image**.

The frontend uses the local backend at `http://127.0.0.1:8000` by default. To use
a different backend URL, set `INFERENCE_API_URL` before starting the frontend.

## Model files and configuration

The model files are downloaded and cached locally on the first analysis
(approximately 900 MB). An internet connection is needed for this initial
download; no inference API key is needed. The default AI-image score threshold is
`0.35`. Configure it with `DEEPFAKE_IMAGE_THRESHOLD`; uploads are limited to
200 MB by default and can be configured with `DEEPFAKE_MAX_UPLOAD_MB`.

The score is an uncalibrated model output, not proof of an image's origin.
Images that are edited, unusually compressed, or outside the model's training
domain may be misclassified. See
[`docs/MODEL_LIMITATIONS.md`](./docs/MODEL_LIMITATIONS.md).

## Checks

Backend tests:

```bash
python -m pytest backend/tests
```

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

## Project layout

```text
backend/     FastAPI service, image inference, reports, and backend tests
frontend/    Next.js interface
docs/        API, architecture, deployment, and model documentation
evaluation/  Evaluation records and model metadata
training/    Research and training utilities
```
