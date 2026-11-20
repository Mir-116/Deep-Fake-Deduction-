"use client";

/**
 * Interactive analysis report (Phase 3): renders the structured report
 * document from GET /v1/analyses/{id}/report. One source of truth — the
 * server-rendered PDF must show exactly these numbers.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { ApiError, artifactUrl, downloadReportPdf, getReport } from "@/lib/api/client";
import { inferenceMode } from "@/lib/inference/provider";
import { getStoredAnalysis } from "@/lib/inference/types";
import { buildClientReport } from "@/lib/inference/report-client";
import type { ReportData } from "@/lib/api/types";
import { WindowsChart } from "@/components/analysis/windows-chart";
import {
  Alert, Badge, Button, ButtonLink, Card, CardContent, CardHeader, CardTitle, Skeleton,
} from "@/components/ui/primitives";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs text-ink-3">{k}</span>
      <span className="break-all text-right font-mono text-xs">{v}</span>
    </div>
  );
}

export default function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t } = useI18n();
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "error">("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);

  const onDownloadPdf = async () => {
    if (pdfState === "loading") return;
    setPdfState("loading");
    setPdfError(null);
    try {
      await downloadReportPdf(id);
      setPdfState("idle");
    } catch (e) {
      const apiErr = e as ApiError;
      setPdfError(
        apiErr.status === 404
          ? t.notFound
          : apiErr.status === 409
            ? t.noData
            : apiErr.status === 500
              ? "PDF generation failed on the backend. Please retry."
              : apiErr.detail,
      );
      setPdfState("error");
    }
  };

  useEffect(() => {
    let alive = true;
    if (inferenceMode() !== "fastapi") {
      // HF guest mode: build the report from the session-stored analysis
      const stored = getStoredAnalysis(id);
      if (stored && stored.status === "COMPLETED") {
        setReport(buildClientReport(stored) as never);
      } else {
        setError(new ApiError(404, "This analysis is not in this browser tab."));
      }
      return;
    }
    getReport(id)
      .then((r) => alive && setReport(r))
      .catch((e: ApiError) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [id]);

  // Prefer artifact URLs from the report document itself; fall back to the
  // deterministic face-preview id for analyses made before Phase 3.
  const artifacts = (report?.artifacts ?? {}) as {
    processed_face?: string | null;
    lime?: string | null;
  };
  const faceUrl = artifactUrl(
    artifacts.processed_face ??
      `/v1/artifacts/face_${(report?.analysis_id ?? id).replace(/-/g, "").slice(0, 20)}`,
  );
  const limeUrl = artifactUrl(artifacts.lime ?? null);
  const isImageReport = report?.overview.media_type === "image";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <ButtonLink href={`/analysis/${id}`} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t.resultsTitle}
        </ButtonLink>
        <span className="font-mono text-xs text-ink-3" dir="ltr">
          {t.analysisId}: {id.slice(0, 8)}…
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t.reportTitle}</h1>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onDownloadPdf}
              disabled={pdfState === "loading"}
              aria-busy={pdfState === "loading"}
              className="print:hidden"
            >
              {pdfState === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              {t.pdfButton}
            </Button>
          </div>
          {pdfState === "error" && pdfError ? <span className="text-[11px] text-verdict-fake">{pdfError}</span> : null}
        </div>
      </div>

      {error && (
        <Alert tone="danger" title={error.status === 409 ? t.statusTitle : t.uploadFailed}>
          {error.status === 409
            ? t.noData
            : error.status === 404
              ? t.notFound
              : error.detail}
        </Alert>
      )}

      {!report && !error && (
        <div className="grid gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      )}

      {report && (
        <div className="grid gap-5">
          <Card className="overflow-hidden rounded-xl border-line/80 bg-surface-1">
            <CardContent className="grid gap-6 p-5 sm:p-7 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-4">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{t.reportSectionOverview}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Badge tone={report.overview.assessment === "FAKE" ? "fake" : "real"} className="px-3 py-1.5 font-mono">
                    {report.overview.assessment ?? "—"}
                  </Badge>
                  <span className="font-mono text-2xl font-semibold" dir="ltr">
                    {report.prediction.fake_score !== null
                      ? `${(report.prediction.fake_score * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-ink-3">{report.media.filename ?? "—"}</p>
              </div>
              <div className="lg:col-span-5">
                <div className="mb-2 flex justify-between gap-3 text-[11px] text-ink-3" dir="ltr">
                  <span>0%</span>
                  <span>
                    {t.threshold}: {report.prediction.threshold !== null
                      ? `${(report.prediction.threshold * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                  <span>100%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-surface-2" dir="ltr">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-verdict-real/70 via-accent/70 to-verdict-fake/80"
                    style={{ width: `${Math.min(100, Math.max(0, (report.prediction.fake_score ?? 0) * 100))}%` }}
                  />
                  {report.prediction.threshold !== null && (
                    <span
                      className="absolute -top-1 -bottom-1 w-0.5 bg-ink-1"
                      style={{ left: `${Math.min(100, Math.max(0, report.prediction.threshold * 100))}%` }}
                    />
                  )}
                </div>
                <p className="mt-2 text-xs text-ink-3">
                  {report.prediction.threshold_version ?? "—"} · {report.prediction.method ?? "—"}
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-4 lg:col-span-3">
                <p className="text-xs text-ink-3">{t.modelVersion}</p>
                <p className="mt-1 break-all font-mono text-sm font-medium">{report.overview.model_version ?? "—"}</p>
                <p className="mt-3 text-xs text-ink-3">{t.processingTime}</p>
                <p className="mt-1 font-mono text-sm">
                  {report.technical.processing_duration_seconds != null
                    ? `${Number(report.technical.processing_duration_seconds).toFixed(2)}s`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Section title="Run details">
            <p className="font-mono text-xs leading-5 text-ink-2" dir="ltr">
              {report.overview.assessment_basis}
            </p>
            <p className="mt-3 text-xs text-ink-3" dir="ltr">
              {t.analysisId}: {report.analysis_id} · {t.created}: {report.overview.created_at}
            </p>
          </Section>

          {/* 3. Prediction summary */}
          <Section title={t.reportSectionPrediction}>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Kv k={t.fakeScore} v={report.prediction.fake_score?.toFixed(6) ?? "—"} />
                <Kv k={t.threshold} v={report.prediction.threshold ?? "—"} />
                <Kv k={t.thresholdVersion} v={report.prediction.threshold_version ?? "—"} />
              </div>
              <div>
                <Kv k={t.method} v={report.prediction.method ?? "—"} />
                <Kv k="score_is_calibrated" v={String(report.prediction.score_is_calibrated)} />
                <Kv
                  k="window stdev"
                  v={report.prediction.window_variation?.stdev?.toFixed(4) ?? "—"}
                />
              </div>
            </div>
            <Alert tone="info" className="mt-3">{t.uncalibrated}</Alert>
          </Section>

          {/* Media information */}
          <Section title={t.reportSectionMedia}>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Kv k="filename" v={String(report.media.filename ?? "—")} />
                <Kv
                  k="file size"
                  v={
                    report.media.size_bytes != null
                      ? Number(report.media.size_bytes) >= 1048576
                        ? `${(Number(report.media.size_bytes) / 1048576).toFixed(2)} MB`
                        : `${(Number(report.media.size_bytes) / 1024).toFixed(1)} KB`
                      : "—"
                  }
                />
                <Kv k="resolution" v={report.media.width ? `${report.media.width}×${report.media.height}` : "—"} />
              </div>
              <div>
                {!isImageReport && (
                  <>
                    <Kv k="duration" v={report.media.duration_seconds != null ? `${Number(report.media.duration_seconds).toFixed(2)}s` : "—"} />
                    <Kv k="fps" v={String(report.media.fps ?? "—")} />
                    <Kv k="frames extracted / analyzed" v={`${report.media.frames_extracted ?? "—"} / ${report.media.frames_analyzed ?? "—"}`} />
                  </>
                )}
                <Kv k="sha256" v={`${String(report.media.sha256 ?? "—").slice(0, 32)}…`} />
              </div>
            </div>
          </Section>

          {/* 4. Timeline */}
          {report.timeline.windows?.length > 0 ? (
            <Section title={t.reportSectionTimeline}>
              <WindowsChart
                windows={report.timeline.windows}
                threshold={report.timeline.threshold}
              />
            </Section>
          ) : null}

          {/* Image preview or video face/LIME artifacts */}
          <div className={`grid gap-5 ${isImageReport ? "" : "sm:grid-cols-2"}`}>
            <Section title={isImageReport ? t.imagePreview : t.reportSectionFace}>
              {faceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faceUrl}
                  alt={isImageReport ? t.imagePreview : t.reportSectionFace}
                  className="mx-auto max-h-64 rounded-lg border border-line object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              ) : (
                <p className="text-sm text-ink-3">{t.noData}</p>
              )}
            </Section>
            {!isImageReport && (
              <Section title={t.reportSectionLime}>
                {limeUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={limeUrl}
                      alt={t.limeTitle}
                      className="mx-auto max-h-64 rounded-lg border border-line object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                    <p className="mt-3 text-xs leading-relaxed text-ink-3">{t.limeLimitation}</p>
                  </>
                ) : (
                  <p className="text-sm text-ink-3">{t.noData}</p>
                )}
              </Section>
            )}
          </div>

          {/* 7. Technical */}
          <Section title={t.reportSectionTechnical}>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Kv k="model" v={report.technical.model ? String((report.technical.model as { version?: string }).version ?? "—") : "—"} />
                <Kv k="checkpoint" v={String((report.technical.model as { checkpoint_sha256?: string })?.checkpoint_sha256 ?? "—").slice(0, 24) + "…"} />
                {!isImageReport && <Kv k="frames" v={report.technical.frames_analyzed ?? "—"} />}
              </div>
              <div>
                <Kv k="method" v={report.technical.prediction_method ?? "—"} />
                <Kv k="duration" v={report.technical.processing_duration_seconds != null ? `${report.technical.processing_duration_seconds}s` : "—"} />
                <Kv k="status" v={report.generated_from_status} />
                {isImageReport ? (
                  <Kv k="image input" v={`${(report.technical.model as { input_size?: number })?.input_size ?? "—"}px model crops`} />
                ) : (
                  <>
                    <Kv
                      k="sequence"
                      v={`${(report.technical.model as { input_frames?: number })?.input_frames ?? "—"} × ${(report.technical.model as { input_size?: number })?.input_size ?? "—"} px`}
                    />
                    <Kv
                      k="preprocessing"
                      v="OpenCV DNN face detect → margin crop → 299×299 → elliptical mask → [0,1]"
                    />
                  </>
                )}
              </div>
            </div>
          </Section>

          {/* Interpretation */}
          <Section title={t.reportInterpretation}>
            <p className="text-sm leading-relaxed text-ink-2">{report.interpretation}</p>
          </Section>

          {/* 8. Warnings + limitations */}
          <Section title={t.reportSectionLimits}>
            {(report.technical.warnings?.length ?? 0) > 0 && (
              <ul className="mb-3 list-inside list-disc text-sm text-ink-2">
                {report.technical.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-ink-3">
              {report.limitations?.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}
