"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages, Moon, ScanSearch, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/provider";
import { inferenceMode } from "@/lib/inference/provider";

export function SiteHeader() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const hfMode = inferenceMode() !== "fastapi";

  const linkCls = (active: boolean) =>
    `text-sm transition-all ${
      active
        ? "bg-surface-3 text-ink-1 shadow-sm ring-1 ring-accent/10"
        : "text-ink-2 hover:bg-surface-3/70 hover:text-ink-1"
    }`;

  return (
    <header className="site-header sticky top-0 z-40 border-b border-sky-300/80 bg-gradient-to-r from-sky-100/95 via-blue-50/95 to-emerald-100/95 shadow-[0_8px_30px_rgba(45,125,153,0.14)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-sky-500 before:via-emerald-400 before:to-rose-400 dark:border-sky-400/20 dark:shadow-[0_8px_30px_rgba(2,6,23,0.38)]">
      <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 text-white shadow-[0_8px_24px_rgba(56,189,248,0.22)]">
            <ScanSearch className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-[15px] font-bold tracking-tight sm:text-base">
            <span className="text-sky-700 dark:text-sky-300">Deep</span>
            <span className="text-ink-1">Fake Detection</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <Link href="/" className={`rounded-lg px-3 py-2 ${linkCls(pathname === "/")}`}>{t.navHome}</Link>
          <Link href="/analyze" className={`rounded-lg px-3 py-2 ${linkCls(pathname.startsWith("/analyze"))}`}>{t.navAnalyze}</Link>
        </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analyze"
            className="group inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-3 text-sm font-bold text-slate-950 shadow-[0_8px_20px_rgba(56,189,248,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(56,189,248,0.28)] sm:px-4"
          >
            <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-emerald-300/20" />
            {t.navAnalyze}
          </Link>
          <span className="hidden items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 text-xs text-ink-2 lg:inline-flex">
            <span className={`h-2 w-2 rounded-full ${hfMode ? "bg-amber-400" : "bg-emerald-400"} ${hfMode ? "" : "animate-pulse"}`} />
            {hfMode ? "Hosted inference" : "Image detector · Local API"}
          </span>
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ur" : "en")}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-violet-400/10 bg-violet-400/5 px-2.5 text-sm text-ink-2 transition-colors hover:border-violet-400/30 hover:text-violet-300"
            aria-label={t.languageLabel}
          >
            <Languages className="h-4 w-4" aria-hidden />
            <span>{locale === "en" ? "اردو" : "EN"}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-400/10 bg-rose-400/5 text-ink-2 transition-colors hover:border-rose-400/30 hover:text-rose-300"
            aria-label={t.themeLabel}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {/* mobile nav row */}
      <nav className="flex items-center justify-center gap-5 border-t border-sky-400/10 bg-surface-2/95 py-2 md:hidden dark:bg-slate-950/95" aria-label="Mobile">
        <Link href="/" className={linkCls(pathname === "/")}>{t.navHome}</Link>
        <Link href="/analyze" className={linkCls(pathname.startsWith("/analyze"))}>{t.navAnalyze}</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const localMode = inferenceMode() === "fastapi";
  return (
    <footer className="site-footer border-t border-sky-200/70 bg-gradient-to-r from-sky-50/80 via-white/80 to-emerald-50/80 before:block before:h-[2px] before:bg-gradient-to-r before:from-sky-400 before:via-emerald-400 before:to-rose-400 dark:border-sky-400/15">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink-3 sm:px-6 lg:px-8">
        {localMode ? t.footerNote : "DeepFake Detection · Image analysis"}
        <span>DeepFake Detection</span>
      </div>
    </footer>
  );
}
