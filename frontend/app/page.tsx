"use client";

import {
  ArrowRight, BarChart3, Image as ImageIcon, LockKeyhole, ScanLine,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { inferenceMode } from "@/lib/inference/provider";
import { Badge, ButtonLink, Card, CardContent } from "@/components/ui/primitives";

export default function Home() {
  const { t } = useI18n();
  const localMode = inferenceMode() === "fastapi";

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-[72%] top-[-18rem] h-[38rem] w-[38rem] rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-[1440px] px-4 pb-14 sm:px-6 lg:px-8">
        <section className="grid items-center gap-10 py-14 lg:min-h-[550px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
          <div className="animate-fade-up">
            <Badge tone="accent" className="mb-6 gap-2 border-emerald-600/25 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
              {localMode ? "Local image analysis" : "Image analysis"}
            </Badge>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Detect AI-generated images with{" "}
              <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">local precision.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-2 sm:text-lg">
              Upload a photo to analyze it with an AI-image detector.{" "}
              {localMode
                ? "Inference runs through the local backend on your machine."
                : "This session is configured to use hosted inference."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/analyze" size="lg" className="rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-6 text-slate-950 shadow-[0_10px_28px_rgba(56,189,248,0.20)]">
                {t.homeCta}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </ButtonLink>
              <div className="flex items-center gap-2 rounded-lg border border-violet-400/10 bg-violet-400/5 px-4 py-3 text-xs text-ink-2">
                <ImageIcon className="h-4 w-4 text-violet-300" aria-hidden />
                JPG <span className="text-sky-300">·</span> PNG
                <span className="text-emerald-300">·</span> WEBP
                <span className="text-rose-300">·</span> BMP
              </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-ink-3">
              <LockKeyhole className="h-4 w-4 text-verdict-real" aria-hidden />
              {localMode
                ? "Images are sent to the local inference backend, not a third-party API."
                : "Inference is handled by the configured hosted provider."}
            </div>
          </div>

          <Card className="animate-fade-up overflow-hidden rounded-xl border-sky-300/80 bg-gradient-to-br from-white/95 via-sky-50/90 to-blue-100/90 shadow-[0_24px_70px_rgba(45,125,153,0.20),0_0_40px_rgba(56,189,248,0.10)] dark:border-sky-400/15 dark:bg-surface-1">
            <div className="flex items-center justify-between border-b border-sky-200/80 bg-gradient-to-r from-sky-100/90 to-blue-100/80 px-5 py-4 dark:border-line dark:bg-surface-1 dark:bg-none">
              <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-400/10 text-sky-300">
                  <ScanLine className="h-4 w-4" aria-hidden />
                </span>
                IMAGE INSPECTOR
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-ink-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                READY
              </div>
            </div>
            <CardContent className="p-4 sm:p-5">
              <div className="relative flex aspect-[1.4] items-center justify-center overflow-hidden rounded-lg border-2 border-sky-300/80 bg-gradient-to-br from-blue-100/90 via-sky-50/90 to-cyan-100/90 shadow-inner dark:border-line dark:bg-surface-2 dark:bg-none">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgb(var(--line))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--line))_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute inset-[12%] rounded-lg border border-accent/20" />
                <div className="absolute inset-[22%] rounded-lg border border-dashed border-accent/20" />
                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-surface-1 text-accent shadow-lg">
                    <ScanLine className="h-8 w-8" aria-hidden />
                  </div>
                  <p className="mt-4 text-sm font-medium">Ready for an image</p>
                  <p className="mt-1 text-xs text-ink-3">Upload to view the analysis</p>
                </div>
                <span className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {localMode ? "Local model" : "Image detector"}
                </span>
                <span className="absolute bottom-3 right-3 font-mono text-[10px] text-ink-3">
                  JPG / PNG / WEBP / BMP
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Model", "AI image detector"],
                  ["Input", "Image"],
                  ["Output", "Score + verdict"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-surface-2 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-ink-3">{label}</p>
                    <p className="mt-1 truncate text-xs font-medium text-ink-1">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 border-t border-line/80 pt-8 sm:grid-cols-3">
          {[
            { icon: LockKeyhole, title: "Local inference", body: "Use the local backend without a paid inference API." },
            { icon: ImageIcon, title: "Image-focused", body: "Analyze supported photo formats with the image detector." },
            { icon: BarChart3, title: "Transparent results", body: "Review the model score, active threshold, and input details." },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="rounded-xl border-line/80 bg-surface-1">
              <CardContent className="flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-2">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
