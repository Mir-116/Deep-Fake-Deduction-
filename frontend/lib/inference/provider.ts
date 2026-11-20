/**
 * Provider factory (Phase 5).
 *
 * NEXT_PUBLIC_INFERENCE_MODE selects the inference backend:
 *   "fastapi"               — local backend (default; local model inference)
 *   "huggingface"           — public HF Space, browser-direct, guest mode
 *
 * Both return the same StoredAnalysis contract; results/report/PDF surfaces
 * are provider-agnostic.
 */

import { createHuggingFaceProvider } from "./huggingface-provider";
import { createFastApiProvider } from "./fastapi-provider";
import type { InferenceProvider } from "./types";

export type InferenceMode = "huggingface" | "fastapi";

export function inferenceMode(): InferenceMode {
  return process.env.NEXT_PUBLIC_INFERENCE_MODE === "huggingface" ? "huggingface" : "fastapi";
}

export function getInferenceProvider(): InferenceProvider {
  if (inferenceMode() === "fastapi") {
    // The FastAPI provider wraps lib/api/client.ts (POST /v1/analyses + polling).
    return createFastApiProvider();
  }
  return createHuggingFaceProvider();
}
