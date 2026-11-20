"use client";

/**
 * Media upload + analysis launcher (subphase 2B/2C).
 * Validation mirrors the backend's actual rules (docs/API.md): extension allow
 * list and DEEPFAKE_MAX_UPLOAD_MB (default 200 MB). Backend limits are
 * surfaced as a constant here; the backend remains the enforcement point.
 */

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Check, FileImage, ImageIcon, Loader2, ScanLine, ShieldCheck, Trash2, UploadCloud,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  Alert, Badge, Button, Card, CardContent,
} from "@/components/ui/primitives";
import { ApiError, createAnalysis } from "@/lib/api/client";
import { inferenceMode, getInferenceProvider } from "@/lib/inference/provider";
import { saveAnalysis } from "@/lib/inference/types";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".bmp", ".webp"];
const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 200);

type Preview = { url: string; kind: "image"; name: string; sizeMb: number };

export default function AnalyzePage() {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusLine, setStatusLine] = useState<string>("");

  const validate = useCallback(
    (f: File): string | null => {
      const ext = `.${f.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const isImage = IMAGE_EXT.includes(ext);
      if (!isImage) return t.badType;
      if (f.size === 0) return t.emptyFile;
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) return t.tooLarge(MAX_UPLOAD_MB);
      return null;
    },
    [t],
  );

  const acceptFile = useCallback(
    (f: File) => {
      const problem = validate(f);
      setError(problem);
      if (problem) {
        setFile(null);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return null;
        });
        return;
      }
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(f), kind: "image", name: f.name, sizeMb: f.size / (1024 * 1024) };
      });
      setFile(f);
    },
    [validate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  const submit = useCallback(async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (inferenceMode() === "fastapi") {
        const res = await createAnalysis(file, {
          explain: false,
        });
        router.push(`/analysis/${res.analysis_id}`);
        return;
      }
      // Hugging Face mode: browser -> Space directly (no Vercel proxying).
      const provider = getInferenceProvider();
      setStatusLine(provider.statusLabel?.("connecting") ?? "");
      const record = await provider.predict(file, {
        enableXai: false,
        filename: file.name,
        mimeType: file.type,
        onStatus: (m) => setStatusLine(provider.statusLabel?.("running") ?? m),
      });
      saveAnalysis(record);
      router.push(`/analysis/${record.analysis_id}`);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.status === 0 ? t.backendDown : `${t.uploadFailed}: ${apiErr.detail}`);
      setSubmitting(false);
    }
  }, [file, submitting, router, t]);

  const exts = IMAGE_EXT.join(",");
  const removeFile = () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]">
            <span>MODULE://IMAGE_INSPECTOR</span>
            <span className="hidden text-sky-300 sm:inline">/</span>
            <span className="hidden text-emerald-300 sm:inline">LOCAL ANALYSIS</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.uploadTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">{t.uploadSubtitle}</p>
        </div>
        <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-sky-300/80 bg-white/70 px-4 py-3 text-xs text-slate-700 shadow-[0_8px_22px_rgba(56,189,248,0.10)] dark:border-sky-400/20 dark:bg-slate-900/70 dark:text-ink-2">
          <span className="flex items-center gap-2 font-medium text-ink-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {t.imageModelName}
          </span>
          <span className="text-ink-3">·</span>
          <span>Local inference</span>
          <span className="text-ink-3">·</span>
          <span>No API key</span>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-7">
          <div
            role="button"
            tabIndex={0}
            aria-label={t.dropHere}
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={`group relative flex min-h-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition-all ${
              dragging
                ? "border-sky-500 bg-sky-100/80 shadow-[0_16px_36px_rgba(14,165,233,0.16)]"
                : "border-sky-300/70 bg-blue-50/80 shadow-[0_12px_30px_rgba(45,125,153,0.10)] hover:border-sky-500 hover:bg-sky-100/80 dark:border-sky-400/20 dark:bg-surface-1 dark:hover:border-sky-400/50"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgb(var(--line))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--line))_1px,transparent_1px)] [background-size:36px_36px]" />
            <div className="relative flex max-w-md flex-col items-center px-6 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-400/25 via-blue-400/15 to-emerald-300/25 text-sky-700 shadow-[0_12px_30px_rgba(14,165,233,0.18)] transition-transform group-hover:scale-105 dark:border-sky-400/20 dark:text-sky-300">
                <ScanLine className="h-8 w-8" aria-hidden />
              </span>
              <h2 className="mt-5 text-lg font-semibold">{t.dropHere}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-2">{t.dropOr}</p>
              <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-4 text-sm font-bold text-slate-950 shadow-[0_8px_20px_rgba(56,189,248,0.16)] transition-transform group-hover:-translate-y-0.5">
                <UploadCloud className="h-4 w-4" aria-hidden />
                {t.browseFiles}
              </span>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                JPG{" · "}PNG{" · "}WEBP{" · "}BMP
              </p>
              <p className="mt-1 text-xs text-ink-3">{t.dropLimits(MAX_UPLOAD_MB)}</p>
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {file ? "IMAGE READY" : "READY FOR IMAGE"}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={exts}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
          />

          <Card className="rounded-xl border-line/80 bg-surface-2 shadow-none">
            <CardContent className="flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-verdict-real">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">Local inference backend</p>
                <p className="mt-1 text-xs leading-5 text-ink-2">
                  The selected image is submitted to the configured inference provider. In local mode, this is the backend running on your machine.
                </p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert tone="danger" className="mt-4">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden /> {error}
              </span>
            </Alert>
          )}
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Card className="overflow-hidden rounded-xl border-line/80 bg-surface-1">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verdict-real">Selected image</p>
                  <h2 className="mt-1 text-sm font-semibold">{preview ? t.selectedFile : "Image preview"}</h2>
                </div>
                {preview && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-verdict-fake transition-colors hover:bg-verdict-fake/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                )}
              </div>
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <FileImage className="mx-auto h-10 w-10 text-ink-3" aria-hidden />
                    <p className="mt-3 text-sm text-ink-2">Your selected image will appear here</p>
                    <p className="mt-1 text-xs text-ink-3">Choose or drop a supported image</p>
                  </div>
                )}
              </div>
              <div className="mt-4 rounded-lg bg-surface-2 p-3">
                {preview ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <ImageIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                        <span className="truncate text-sm font-medium">{preview.name}</span>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-ink-2">{preview.sizeMb.toFixed(2)} MB</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-verdict-real">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Image is ready to analyze
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
                    <span>File details</span>
                    <span>Waiting for image</span>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                onClick={submit}
                disabled={!file || submitting || !!error}
                className="mt-4 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 font-bold text-slate-950 shadow-[0_10px_26px_rgba(56,189,248,0.16)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {statusLine || t.analyzing}
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4" aria-hidden />
                    {t.analyzeButton}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-line/80 bg-surface-1">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Model details</p>
                <Badge tone="accent">LOCAL MODEL</Badge>
              </div>
              <p className="text-sm font-medium">{t.imageModelName}</p>
              <p className="mt-1 text-xs leading-5 text-ink-2">{t.imageModelHint}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
