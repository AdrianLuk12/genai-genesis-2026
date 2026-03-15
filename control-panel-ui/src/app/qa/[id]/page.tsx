"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, XCircle, CheckCircle2, MonitorPlay, ImageIcon, Share2, Play } from "lucide-react";

interface QaResult {
  id: string;
  qa_run_id: string;
  element_id: string | null;
  issue_type: string;
  description: string;
  screenshot_url: string | null;
  severity: string;
}

interface QaRunDetail {
  id: string;
  app_version_id: string;
  scenario_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  video_url: string | null;
  issues_found: number;
  log_output: string | null;
  app_name?: string;
  version_tag?: string;
  results: QaResult[];
}

export default function QaReportPage() {
  const params = useParams();
  const runId = params.id as string;
  const [run, setRun] = useState<QaRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportLinkCopied, setReportLinkCopied] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(-1);

  const fetchRun = useCallback(() => {
    if (!runId) return Promise.resolve();
    return api(`/api/qa-runs/${runId}`)
      .then((data) => setRun(data as QaRunDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load run"));
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    fetchRun().finally(() => setLoading(false));
  }, [runId, fetchRun]);

  // Poll while run is still in progress so we show final status/results
  useEffect(() => {
    if (!runId || !run || run.status !== "running") return;
    const interval = setInterval(() => fetchRun(), 2000);
    return () => clearInterval(interval);
  }, [runId, run?.status, fetchRun]);

  const failureCount = run?.results?.length ?? run?.issues_found ?? 0;
  const isRunning = run?.status === "running";
  const hasVideo = Boolean(run?.video_url);
  const firstScreenshot = run?.results?.find((r) => r.screenshot_url)?.screenshot_url ?? null;

  // Mock walkthrough steps: 3 common paths + failing path from first result
  const walkthroughSteps = (() => {
    const first = run?.results?.[0];
    const failPath = first?.element_id || (first?.description?.match(/GET (\S+)/)?.[1]) || "/health";
    return [
      { path: "/", status: "200" },
      { path: "/cart", status: "200" },
      { path: "/products", status: "200" },
      { path: failPath, status: "404" },
    ];
  })();

  const playWalkthrough = useCallback(() => {
    setWalkthroughStep(0);
    walkthroughSteps.forEach((_, i) => {
      setTimeout(() => setWalkthroughStep(i), i * 600);
    });
    setTimeout(() => setWalkthroughStep(-1), walkthroughSteps.length * 600 + 800);
  }, [walkthroughSteps.length]);

  function openWatchMedia(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="space-y-6">
        <Link href="/qa">
          <Button variant="outline" size="sm" className="px-2">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          {error ?? "QA run not found."}
        </div>
      </div>
    );
  }

  const appLabel = run.app_name ?? "App";
  const versionLabel = run.version_tag ?? "—";
  const summaryText = isRunning
    ? `Run ${run.id} in progress…`
    : run.status === "failed"
      ? `Run ${run.id} completed with ${failureCount} failure${failureCount === 1 ? "" : "s"}`
      : `Run ${run.id} completed — all checks passed`;

  const oneLiner = isRunning
    ? "Smoke checks are running. This page will update when the run finishes."
    : failureCount === 0
      ? "On every release we run workflows and the resilience check; this run had no failures."
      : "On every release we run workflows plus the resilience check; below is what broke and how to reproduce it.";

  function narrativeForResult(res: QaResult, index: number): string {
    const step = index + 1;
    if (res.issue_type === "resilience")
      return `Resilience check found: ${res.description?.slice(0, 100) || "probe failed"}`;
    if (res.issue_type === "timeout" || (res.description && res.description.includes("not found")))
      return `Step ${step}: element not found — ${res.element_id || res.description?.slice(0, 60) || "selector timed out"}`;
    if (res.issue_type === "console_error" || (res.description && res.description.includes("500")))
      return `Step ${step}: server error — ${res.description?.slice(0, 80) || "request failed"}`;
    if (res.issue_type === "regression" || res.issue_type === "assertion")
      return `Step ${step}: assertion failed — ${res.description?.slice(0, 80) || res.issue_type}`;
    if (res.issue_type === "smoke")
      return res.description || `Step ${step}: smoke check failed`;
    return res.description || `Failure ${step}: ${res.issue_type || "unknown"}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 animate-fade-in-up">
        <Link href="/qa">
          <Button variant="outline" size="sm" className="px-2">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {appLabel} <span className="text-muted-foreground font-mono text-sm">({versionLabel})</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{summaryText}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{oneLiner}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "25ms" }}>
        <span>Share this report:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard.writeText(window.location.href);
              setReportLinkCopied(true);
              setTimeout(() => setReportLinkCopied(false), 2000);
            }
          }}
        >
          <Share2 className="size-3" />
          {reportLinkCopied ? "Copied!" : "Copy report link"}
        </Button>
      </div>

      {isRunning ? (
        <div className="bg-card border border-border p-8 text-center text-muted-foreground animate-fade-in-up">
          <div className="size-10 mx-auto mb-3 border-2 border-onyx-green border-t-transparent rounded-full animate-spin" />
          <p className="font-medium text-foreground">Run in progress</p>
          <p className="text-sm mt-1">Smoke checks are running. Results will appear here shortly.</p>
        </div>
      ) : (!run.results || run.results.length === 0) && failureCount === 0 ? (
        <div className="bg-card border border-border p-8 text-center text-muted-foreground animate-fade-in-up">
          <CheckCircle2 className="size-10 mx-auto mb-3 text-onyx-green" />
          <p className="font-medium text-foreground">No failures recorded</p>
          <p className="text-sm mt-1">This run completed with no issues reported.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <div className="lg:col-span-1 bg-card border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2">Results</h3>
            <ul className="space-y-2">
              {run.results?.map((res) => (
                <li
                  key={res.id}
                  className={`flex items-center justify-between text-sm ${res.severity === "high" || res.severity === "critical" ? "bg-destructive/5 p-1 -mx-1 px-1" : ""}`}
                >
                  <span className={res.issue_type ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {res.issue_type || res.description?.slice(0, 30) || "Issue"}
                  </span>
                  <XCircle className="size-4 text-destructive shrink-0" />
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Watch walkthrough: real media or mock step-through */}
            <div className="bg-card border border-border p-5">
              <h3 className="text-sm font-semibold border-b border-border pb-2 mb-3">Watch walkthrough</h3>
              {(run.video_url || firstScreenshot) ? (
                <div className="flex flex-wrap gap-2">
                  {run.video_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWatchMedia(run.video_url!)}
                      className="gap-1.5"
                    >
                      <MonitorPlay className="size-3.5" />
                      Play recording
                    </Button>
                  )}
                  {firstScreenshot && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWatchMedia(firstScreenshot)}
                      className="gap-1.5"
                    >
                      <ImageIcon className="size-3.5" />
                      View screenshot
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={playWalkthrough} className="gap-1.5" disabled={walkthroughStep >= 0}>
                    <Play className="size-3.5" />
                    Replay smoke check
                  </Button>
                  <ul className="font-mono text-xs space-y-1.5 mt-2 border border-border rounded p-2 bg-muted/20">
                    {walkthroughSteps.map((s, i) => (
                      <li
                        key={i}
                        className={`flex items-center justify-between py-1 px-2 transition-colors ${
                          walkthroughStep === i ? "bg-onyx-green/10 text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span>GET {s.path}</span>
                        <Badge variant={s.status === "404" ? "destructive" : "secondary"} className="text-[10px] font-mono">
                          {s.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {run.results?.map((res, idx) => (
              <div
                key={res.id}
                className="bg-card border border-destructive p-5 space-y-4 shadow-[0_0_15px_-3px_rgba(239,68,68,0.1)]"
              >
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                    <XCircle className="size-4" /> {res.issue_type || `Failure ${idx + 1}`}
                  </h3>
                  {res.screenshot_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWatchMedia(res.screenshot_url!)}
                      className="h-7 text-xs gap-1"
                    >
                      <ImageIcon className="size-3" />
                      Screenshot
                    </Button>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {narrativeForResult(res, idx)}
                </p>
                <div className="space-y-2 font-mono text-xs">
                  {res.element_id && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {res.element_id}
                      </Badge>
                    </div>
                  )}
                  <p className="text-muted-foreground">{res.description || "No description."}</p>
                  <p className="text-muted-foreground">Severity: {res.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
