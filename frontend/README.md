# Frontend

The frontend is a Next.js 14 application built with React, TypeScript, and
Tailwind CSS. It provides the image-upload workflow, analysis results, and
downloadable reports.

## Run locally

Requirements: Node.js 18.17+ and a running local FastAPI backend.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend proxies API
requests to `http://127.0.0.1:8000` by default. Set `INFERENCE_API_URL` to use a
different backend address.

## Image analysis flow

1. Open **Analyze Image**.
2. Select or drop a JPG, JPEG, PNG, WEBP, or BMP file (maximum 200 MB by default).
3. Review the preview and file details, then select **Analyze**.
4. Review the classification, raw model score, decision threshold, and input
   information. Open the detailed report to print or download a PDF.

The score is an uncalibrated model output and should be treated as an indication,
not proof of image origin. The backend performs inference locally; no paid
inference API key is required.

## Validate

```bash
npm run build
npm run lint
```
