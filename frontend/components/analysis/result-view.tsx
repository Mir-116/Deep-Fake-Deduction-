"use client";

import Image from "next/image";
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleX, Clock3, FileText, Image as ImageIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { artifactUrl } from "@/lib/api/client";
import type { AnalysisResponse } from "@/lib/api/types";
import {
  Alert, Badge, ButtonLink, Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/primitives";
import { WindowsChart } from "./windows-chart";

const METHOD_KEY: Record<string, string> = {
  full_sequence: "methodFull",
  sliding_window_ensemble: "methodEnsemble",
  replicated_frame_sequence: "methodReplicated",
};

function fmtSeconds(s: number | null | undefined): string {
  if (s === null || s === undefined) return "—";
  return s >= 1 ? `${s.toFixed(1)}s` : `${Math.round(s * 1000)}ms`;
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/80 py-2.5 last:border-0">
      <dt className="shrink-0 text-xs text-ink-3">{label}</dt>
      <dd className="break-all text-right font-mono text-xs text-ink-1">{children}</dd>
    </div>
  );
}

export function ResultView({ analysis }: { analysis: AnalysisResponse }) {
  const { t } = useI18n();
  const prediction = analysis.prediction;
  const media = analysis.media;
  if (!prediction) return null;

  const fake = prediction.label === "FAKE";
  const isImage = media?.type === "image";
  const score = prediction.fake_score;
  const threshold = prediction.threshold;
  const imageUrl = artifactUrl(analysis.artifacts?.processed_face);
  const limeUrl = artifactUrl(analysis.artifacts?.lime);
  const methodKey = isImage ? "methodThreeCrop" : METHOD_KEY[prediction.method];
  const modelVersion = analysis.model?.version ?? "—";

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4">
        <ButtonLink href="/analyze" variant="secondary" size="sm">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t.navAnalyze}
        </ButtonLink>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-verdict-real" />
            Analysis complete
          </span>
          <span className="font-mono" dir="ltr">{t.analysisId}: {analysis.analysis_id.slice(0, 8)}…</span>
        </div>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            IMAGE INSPECTION RESULT
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.resultsTitle}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span className="max-w-[min(70vw,420px)] truncate rounded bg-surface-1 px-2 py-1 font-mono text-xs text-ink-1">
              {media?.filename ?? "—"}
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-verdict-real">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              {fmtSeconds(analysis.processing?.duration_seconds)}
            </span>
          </p>
        </div>
        <Badge tone={fake ? "fake" : "real"} className="self-start px-3 py-1.5 font-mono text-xs uppercase tracking-wider sm:self-auto">
          {fake ? "AI-generated" : "Classified as real"}
        </Badge>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-7">
          <Card className={`relative overflow-hidden rounded-xl border ${fake ? "border-verdict-fake/30" : "border-verdict-real/30"} bg-surface-1`}>
            <div className={`pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl ${fake ? "bg-verdict-fake/10" : "bg-verdict-real/10"}`} />
            <CardContent className="relative p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-line/80 pb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  MODEL CLASSIFICATION
                </span>
                <Badge tone="neutral">{isImage ? "Image detector" : "Video detector"}</Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${fake ? "bg-verdict-fake/15 text-verdict-fake" : "bg-verdict-real/15 text-verdict-real"}`}>
                    {fake ? <CircleX className="h-8 w-8" aria-hidden /> : <CheckCircle2 className="h-8 w-8" aria-hidden />}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-3">Verdict</p>
                    <p className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${fake ? "text-verdict-fake" : "text-verdict-real"}`}>
                      {fake ? t.verdictFake : t.verdictReal}
                    </p>
                  </div>
                </div>
                <p className="max-w-xs text-sm leading-6 text-ink-2">
                  The model classified this {isImage ? "image" : "video"} as {fake ? "AI-generated" : "real"}.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-xl border-line/80 bg-surface-1">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-2">{isImage ? t.imageScore : t.fakeScore}</p>
                  <Badge tone="accent">MODEL SCORE</Badge>
                </div>
                <p className={`mt-4 font-mono text-4xl font-semibold tracking-tight ${fake ? "text-verdict-fake" : "text-ink-1"}`} dir="ltr">
                  {score !== null && score !== undefined ? `${(score * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="mt-2 text-xs text-ink-3">Raw model output · 0 to 100%</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-line/80 bg-surface-1">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-2">{t.threshold}</p>
                  <Badge tone="neutral">ACTIVE</Badge>
                </div>
                <p className="mt-4 font-mono text-4xl font-semibold tracking-tight text-ink-1" dir="ltr">
                  {threshold !== null && threshold !== undefined ? `${(threshold * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="mt-2 text-xs text-ink-3">
                  {t.thresholdVersion}: {prediction.threshold_version}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-line/80 bg-surface-1">
            <CardHeader className="flex-row items-center justify-between gap-3 border-b-0 pb-0">
              <CardTitle>{isImage ? "AI-generated score range" : t.timelineTitle}</CardTitle>
              <span className="font-mono text-[10px] text-ink-3">SCORE / THRESHOLD</span>
            </CardHeader>
            {isImage && score !== null && score !== undefined ? (
              <CardContent className="pt-4">
                <div className="mb-3 flex justify-between text-[11px] text-ink-3" dir="ltr">
                  <span>0% · Lower score</span>
                  <span>100% · Higher score</span>
                </div>
                <div
                  className="relative h-4 rounded-full bg-surface-2"
                  role="img"
                  aria-label={`Model score ${(score * 100).toFixed(1)} percent; decision threshold ${threshold !== null && threshold !== undefined ? (threshold * 100).toFixed(1) : "not available"} percent`}
                  dir="ltr"
                >
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-verdict-real/70 via-accent/70 to-verdict-fake/80" style={{ width: `${Math.min(100, Math.max(0, score * 100))}%` }} />
                  {threshold !== null && threshold !== undefined && (
                    <div className="absolute -top-1 -bottom-1 z-10 w-0.5 bg-ink-1" style={{ left: `${Math.min(100, Math.max(0, threshold * 100))}%` }} />
                  )}
                  <div className={`absolute -top-1 -bottom-1 z-20 w-1 rounded-full ${fake ? "bg-verdict-fake" : "bg-verdict-real"}`} style={{ left: `calc(${Math.min(100, Math.max(0, score * 100))}% - 2px)` }} />
                </div>
                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-verdict-real">{t.verdictReal}</span>
                  {threshold !== null && threshold !== undefined && (
                    <span className="text-ink-2">Threshold: {(threshold * 100).toFixed(1)}%</span>
                  )}
                  <span className="text-verdict-fake">{t.verdictFake}</span>
                </div>
              </CardContent>
            ) : (
              <CardContent className="pt-4">
                {analysis.windows?.length ? (
                  <WindowsChart windows={analysis.windows} threshold={threshold} />
                ) : <p className="text-sm text-ink-3">{t.noData}</p>}
              </CardContent>
            )}
          </Card>

          <Card className="rounded-xl border-line/80 bg-surface-1">
            <CardHeader className="border-b-0 pb-0">
              <CardTitle>{t.reportSectionTechnical}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-8 sm:grid-cols-2">
              <dl>
                <MetaRow label={t.modelVersion}>{modelVersion}</MetaRow>
                <MetaRow label={t.method}>{methodKey ? t[methodKey as keyof typeof t] as string : prediction.method}</MetaRow>
              </dl>
              <dl>
                <MetaRow label="Input">{analysis.model?.input_size ? `${analysis.model.input_size}px image crops` : "—"}</MetaRow>
                <MetaRow label={t.processingTime}>{fmtSeconds(analysis.processing?.duration_seconds)}</MetaRow>
              </dl>
            </CardContent>
          </Card>

          {(analysis.processing?.warnings?.length ?? 0) > 0 && (
            <Alert tone="warning" title={t.warnings}>
              <ul className="list-inside list-disc space-y-1">
                {analysis.processing.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
              </ul>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink href={`/analysis/${analysis.analysis_id}/report`} size="lg" className="dark:text-slate-950">
              <FileText className="h-4 w-4" aria-hidden />
              {t.openReport}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/analyze" variant="secondary" size="lg">
              <ImageIcon className="h-4 w-4" aria-hidden />
              Analyze another image
            </ButtonLink>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <Card className="overflow-hidden rounded-xl border-line/80 bg-surface-1">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>{isImage ? t.imagePreview : t.facePreview}</CardTitle>
              <Badge tone="neutral">{media?.type ?? "media"}</Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {imageUrl ? (
                <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                  <Image
                    src={imageUrl}
                    alt={isImage ? t.imagePreview : t.facePreview}
                    width={1024}
                    height={1024}
                    unoptimized
                    className="h-auto max-h-[560px] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface-2 text-center">
                  <ImageIcon className="h-8 w-8 text-ink-3" aria-hidden />
                  <p className="mt-3 text-sm text-ink-2">{t.noData}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-line/80 bg-surface-1">
            <CardHeader className="border-b-0 pb-0">
              <CardTitle>{t.reportSectionMedia}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <MetaRow label="Filename">{media?.filename ?? "—"}</MetaRow>
                <MetaRow label="Dimensions">
                  {media?.width && media?.height ? `${media.width} × ${media.height} px` : "—"}
                </MetaRow>
                <MetaRow label="File size">
                  {media?.size_bytes != null
                    ? `${(Number(media.size_bytes) / (1024 * 1024)).toFixed(2)} MB`
                    : "—"}
                </MetaRow>
                <MetaRow label="SHA-256">{media?.sha256 ? `${media.sha256.slice(0, 20)}…` : "—"}</MetaRow>
              </dl>
            </CardContent>
          </Card>

          {!isImage && limeUrl && (
            <Card className="rounded-xl border-line/80 bg-surface-1">
              <CardHeader><CardTitle>{t.limeTitle}</CardTitle></CardHeader>
              <CardContent className="pt-4">
                <Image
                  src={limeUrl}
                  alt={t.limeTitle}
                  width={299}
                  height={299}
                  unoptimized
                  className="mx-auto h-auto max-h-72 w-auto rounded-lg object-contain"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
