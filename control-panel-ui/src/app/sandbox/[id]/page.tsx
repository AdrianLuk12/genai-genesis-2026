"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-modal";
import { useEditName } from "@/components/ui/edit-name-modal";
import { Pencil } from "lucide-react";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  created_at: string;
  name: string | null;
}

interface CapturedStep {
  index: number;
  timestamp: number;
  url: string;
  selector: string;
  fallbackSelectors: string[];
  elementTag: string;
  elementText: string;
  pageTitle: string;
  action?: "click" | "input";
  inputValue?: string;
  inputType?: string;
}

interface Scenario {
  id: string;
  name: string;
  walkthrough_steps: CapturedStep[] | null;
}

interface LogEntry {
  timestamp: number;
  type: "capture" | "replay" | "info" | "error";
  message: string;
}

interface ClickIndicator {
  x: number;
  y: number;
  width: number;
  height: number;
  key: number;
}

const LOADING_MESSAGES = [
  "Spinning up container",
  "Connecting to environment",
  "Loading application",
  "Almost ready",
];

function SandboxLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9F8F6]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #C9B59C 2px, #C9B59C 3px)",
        }} />
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#C9B59C]/10 to-transparent animate-scan-line"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-fade-in-up">
          <h2 className="font-display font-bold text-2xl tracking-[0.2em] uppercase text-foreground/80">
            Initializing
          </h2>
        </div>
        <div className="w-64 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="h-px bg-border w-full relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-foreground/60 animate-progress-fill" />
          </div>
        </div>
        <div className="h-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <p
            key={messageIndex}
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground animate-fade-in"
          >
            {LOADING_MESSAGES[messageIndex]}
            <span className="dot-loading">
              <span className="inline-block">.</span>
              <span className="inline-block">.</span>
              <span className="inline-block">.</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SandboxViewPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;

  const { confirm } = useConfirm();
  const editName = useEditName();
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sandboxReady, setSandboxReady] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [pollKey, setPollKey] = useState(0);

  // Capture state
  const [capturedSteps, setCapturedSteps] = useState<CapturedStep[]>([]);
  const capturedStepsRef = useRef<CapturedStep[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Replay state
  const [walkthroughSteps, setWalkthroughSteps] = useState<CapturedStep[] | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [replayError, setReplayError] = useState<string | null>(null);
  const replayAbortRef = useRef(false);

  // Click indicator overlay
  const [clickIndicator, setClickIndicator] = useState<ClickIndicator | null>(null);
  const indicatorKeyRef = useRef(0);

  // Console log
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const [unseenLogCount, setUnseenLogCount] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logExpandedRef = useRef(false);

  const addLog = useCallback((type: LogEntry["type"], msg: string) => {
    setLogEntries((prev) => [...prev, { timestamp: Date.now(), type, message: msg }]);
    if (!logExpandedRef.current) setUnseenLogCount((prev) => prev + 1);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    logExpandedRef.current = logExpanded;
    if (logExpanded) setUnseenLogCount(0);
  }, [logExpanded]);

  // Auto-scroll log
  useEffect(() => {
    if (logExpanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logEntries, logExpanded]);

  useEffect(() => {
    api("/api/sandboxes")
      .then((sandboxes: Sandbox[]) => {
        const found = sandboxes.find((s) => s.container_id === containerId);
        setSandbox(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [containerId]);

  // Fetch parent scenario's walkthrough_steps
  useEffect(() => {
    if (!sandbox) return;
    api(`/api/scenarios/${sandbox.scenario_id}`)
      .then((scenario: Scenario) => {
        if (scenario.walkthrough_steps && scenario.walkthrough_steps.length > 0) {
          setWalkthroughSteps(scenario.walkthrough_steps);
        }
      })
      .catch(() => {});
  }, [sandbox]);

  // Poll for sandbox readiness (poll direct URL, not proxy)
  useEffect(() => {
    if (!sandbox) return;
    setSandboxReady(false);
    setPollTimedOut(false);
    const startTime = Date.now();
    const interval = setInterval(async () => {
      try {
        await fetch(sandbox.sandbox_url, { mode: "no-cors" });
        setSandboxReady(true);
        clearInterval(interval);
      } catch {
        if (Date.now() - startTime > 30000) {
          setPollTimedOut(true);
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sandbox, pollKey]);

  // Listen for postMessage from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!sandbox) return;
      // Only accept messages from localhost origins
      if (!event.origin.startsWith("http://localhost")) return;

      const { type } = event.data || {};

      if (type === "step-captured") {
        const step = event.data.step as CapturedStep;
        capturedStepsRef.current = [...capturedStepsRef.current, step];
        setCapturedSteps(capturedStepsRef.current);
        const actionLabel = step.action === "input"
          ? `Input: "${(step.inputValue || "").slice(0, 30)}" into ${step.selector}`
          : `Click: ${step.elementTag} "${step.elementText.slice(0, 40)}" at ${step.selector}`;
        addLog("capture", actionLabel);
      }

      if (type === "replay-click-location") {
        const key = ++indicatorKeyRef.current;
        setClickIndicator({
          x: event.data.x,
          y: event.data.y,
          width: event.data.width,
          height: event.data.height,
          key,
        });
        setTimeout(() => {
          setClickIndicator((prev) => (prev?.key === key ? null : prev));
        }, 1200);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandbox, addLog]);

  // Send start-capture once sandbox is ready
  useEffect(() => {
    if (!sandboxReady || !iframeRef.current || !sandbox) return;

    const iframe = iframeRef.current;
    const sendCapture = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "start-capture" }, new URL(sandbox.sandbox_url).origin);
        addLog("info", "Capture started");
      }
    };

    const timer = setTimeout(sendCapture, 1500);
    return () => clearTimeout(timer);
  }, [sandboxReady, sandbox, addLog]);

  const retry = useCallback(() => setPollKey((k) => k + 1), []);

  async function renameSandbox() {
    if (!sandbox) return;
    const newName = await editName({
      title: "Rename Sandbox",
      currentName: sandbox.name || "",
    });
    if (newName === null) return;
    const prev = { ...sandbox };
    setSandbox((s) => (s ? { ...s, name: newName || null } : s));
    try {
      await api(`/api/sandboxes/${containerId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      });
    } catch {
      setSandbox(prev);
    }
  }

  async function saveState() {
    const ok = await confirm({
      title: "Save Walkthrough State",
      description: `The current state will be saved as a new scenario${capturedStepsRef.current.length > 0 ? ` with ${capturedStepsRef.current.length} captured steps` : ""}. The sandbox will be destroyed after saving.`,
      confirmText: "Save State",
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      if (iframeRef.current?.contentWindow && sandbox) {
        iframeRef.current.contentWindow.postMessage({ type: "stop-capture" }, new URL(sandbox.sandbox_url).origin);
      }

      const body: Record<string, unknown> = {};
      if (capturedStepsRef.current.length > 0) {
        body.walkthrough_steps = capturedStepsRef.current;
      }

      await api(`/api/sandboxes/${containerId}/save`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      addLog("info", `State saved with ${capturedStepsRef.current.length} steps`);
      setMessage("State saved successfully! Redirecting...");
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      setActionLoading(false);
    }
  }

  async function destroySandbox() {
    const ok = await confirm({
      title: "Destroy Sandbox",
      description: "This sandbox will be permanently removed. This action cannot be undone.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
      setMessage("Sandbox destroyed. Redirecting...");
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Destroy failed");
      setActionLoading(false);
    }
  }

  // Replay logic
  async function startReplay() {
    if (!walkthroughSteps || !iframeRef.current || !sandbox) return;
    setReplaying(true);
    setReplayStep(0);
    setReplayError(null);
    replayAbortRef.current = false;
    addLog("replay", `Starting replay of ${walkthroughSteps.length} steps`);

    const targetOrigin = new URL(sandbox.sandbox_url).origin;

    // Stop capture during replay to avoid recording replay clicks
    iframeRef.current.contentWindow?.postMessage({ type: "stop-capture" }, targetOrigin);

    for (let i = 0; i < walkthroughSteps.length; i++) {
      if (replayAbortRef.current) break;

      // Use flushSync to guarantee the step counter renders before we proceed
      flushSync(() => setReplayStep(i + 1));

      const step = walkthroughSteps[i];
      const action = step.action || "click";

      // Navigate if URL differs from previous step
      const prevUrl = i > 0 ? walkthroughSteps[i - 1].url : null;
      if (prevUrl !== step.url) {
        addLog("info", `Navigating to ${step.url}`);
        iframeRef.current!.contentWindow?.postMessage(
          { type: "navigate", url: step.url },
          targetOrigin
        );
        const navOk = await waitForMessage("navigate-done", 5000);
        if (!navOk && !replayAbortRef.current) {
          // Navigation may have caused full page reload — wait for bridge to reload
          await sleep(2000);
        } else {
          await sleep(500);
        }
      }

      if (replayAbortRef.current) break;

      if (action === "input") {
        addLog("replay", `Step ${i + 1}: typing "${(step.inputValue || "").slice(0, 30)}" into ${step.selector}`);
        let inputDone = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (replayAbortRef.current) break;
          iframeRef.current!.contentWindow?.postMessage(
            {
              type: "replay-input",
              selector: step.selector,
              fallbackSelectors: step.fallbackSelectors,
              value: step.inputValue,
              index: step.index,
            },
            targetOrigin
          );
          const result = await waitForMessage("replay-input-done", 3000);
          if (result?.success) {
            inputDone = true;
            addLog("replay", `Step ${i + 1} completed`);
            break;
          }
          await sleep(500);
        }
        if (!inputDone && !replayAbortRef.current) {
          addLog("error", `Step ${i + 1} failed: element not found ${step.selector}`);
          flushSync(() => setReplayError(`Step ${i + 1} failed: element not found ${step.selector}`));
          const userAction = await waitForReplayDecision();
          if (userAction === "stop") {
            replayAbortRef.current = true;
            break;
          }
          flushSync(() => setReplayError(null));
          continue;
        }
      } else {
        addLog("replay", `Step ${i + 1}: clicking ${step.selector}`);
        let clicked = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (replayAbortRef.current) break;
          iframeRef.current!.contentWindow?.postMessage(
            {
              type: "replay-click",
              selector: step.selector,
              fallbackSelectors: step.fallbackSelectors,
              index: step.index,
            },
            targetOrigin
          );
          const result = await waitForMessage("replay-click-done", 3000);
          if (result?.success) {
            clicked = true;
            addLog("replay", `Step ${i + 1} completed`);
            break;
          }
          await sleep(500);
        }
        if (!clicked && !replayAbortRef.current) {
          addLog("error", `Step ${i + 1} failed: element not found ${step.selector}`);
          flushSync(() => setReplayError(`Step ${i + 1} failed: element not found ${step.selector}`));
          const userAction = await waitForReplayDecision();
          if (userAction === "stop") {
            replayAbortRef.current = true;
            break;
          }
          flushSync(() => setReplayError(null));
          continue;
        }
      }

      await sleep(800);
    }

    // Restart capture after replay
    iframeRef.current?.contentWindow?.postMessage({ type: "start-capture" }, targetOrigin);

    addLog("replay", replayAbortRef.current ? "Replay stopped" : "Replay complete");
    setReplaying(false);
    setReplayStep(0);
    setReplayError(null);
  }

  function stopReplay() {
    replayAbortRef.current = true;
    setReplaying(false);
    setReplayStep(0);
    setReplayError(null);
    replayDecisionResolverRef.current = null;
  }

  function waitForMessage(type: string, timeout: number): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", handler);
        resolve(null);
      }, timeout);

      function handler(event: MessageEvent) {
        if (!event.origin.startsWith("http://localhost")) return;
        if (event.data?.type === type) {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          resolve(event.data);
        }
      }

      window.addEventListener("message", handler);
    });
  }

  const replayDecisionResolverRef = useRef<((v: "skip" | "stop") => void) | null>(null);

  function waitForReplayDecision(): Promise<"skip" | "stop"> {
    return new Promise((resolve) => {
      replayDecisionResolverRef.current = resolve;
    });
  }

  function skipReplayStep() {
    replayDecisionResolverRef.current?.("skip");
    replayDecisionResolverRef.current = null;
  }

  function stopReplayOnError() {
    replayDecisionResolverRef.current?.("stop");
    replayDecisionResolverRef.current = null;
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-4">
        <div className="h-8 w-56 skeleton-block" />
        <div className="skeleton-block" style={{ height: "calc(100vh - 260px)" }} />
      </div>
    );
  }

  if (!sandbox) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-24 gap-4">
        <p className="font-display text-lg text-muted-foreground uppercase tracking-widest">
          Sandbox not found
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-in-left">
        <div className="group">
          <button
            type="button"
            className="flex items-center gap-2 hover:text-foreground/70 transition-colors duration-200"
            onClick={renameSandbox}
          >
            <h1 className="font-display font-bold text-2xl tracking-tight">
              {sandbox.name || `Sandbox :${sandbox.port}`}
            </h1>
            <Pencil className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity duration-200 mt-1" />
          </button>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            :{sandbox.port} / {sandbox.container_id.substring(0, 12)}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {walkthroughSteps && !replaying && (
            <Button variant="outline" onClick={startReplay} disabled={actionLoading}>
              Replay
            </Button>
          )}
          {replaying && (
            <Button variant="outline" onClick={stopReplay}>
              Stop Replay
            </Button>
          )}
          <Button variant="outline" onClick={saveState} disabled={actionLoading || replaying}>
            Save Walkthrough State
          </Button>
          <Button
            variant="destructive"
            onClick={destroySandbox}
            disabled={actionLoading || replaying}
          >
            Destroy Sandbox
          </Button>
        </div>
      </div>

      {/* Replay progress */}
      {replaying && (
        <Card className="animate-slide-in-top border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm font-mono">
              Replaying step {replayStep} / {walkthroughSteps!.length}
            </p>
            <div className="w-32 h-1 bg-border overflow-hidden">
              <div
                className="h-full bg-foreground/60 transition-all duration-300"
                style={{ width: `${(replayStep / walkthroughSteps!.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replay error */}
      {replayError && (
        <Card className="animate-slide-in-top border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm text-destructive">{replayError}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={skipReplayStep}>
                Skip
              </Button>
              <Button variant="destructive" size="sm" onClick={stopReplayOnError}>
                Stop Replay
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status message */}
      {message && (
        <Card className="animate-slide-in-top border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="py-3">
            <p className="text-sm">{message}</p>
          </CardContent>
        </Card>
      )}

      {/* Iframe container */}
      <Card className="border-border overflow-hidden animate-fade-in-scale" style={{ animationDelay: "100ms" }}>
        <CardHeader className="pb-2 border-b border-border/50 bg-secondary/30">
          <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 bg-green-500/80 inline-block"
                style={{ animation: sandboxReady ? "none" : "pulse-subtle 2s ease-in-out infinite" }}
              />
              {sandboxReady ? "LIVE" : "CONNECTING"}
            </span>
            <span className="text-border">|</span>
            <a
              href={sandbox.sandbox_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors duration-200"
            >
              {sandbox.sandbox_url}
            </a>
            {sandboxReady && capturedSteps.length > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 bg-red-500/80 inline-block animate-pulse" />
                  REC {capturedSteps.length} steps
                </span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 relative">
          {!sandboxReady && !pollTimedOut && <SandboxLoader />}

          {pollTimedOut && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9F8F6] animate-fade-in gap-4"
              style={{ height: "calc(100vh - 280px)" }}
            >
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Taking longer than expected
              </p>
              <Button onClick={retry}>Retry Connection</Button>
            </div>
          )}

          {/* Click indicator overlay */}
          {clickIndicator && (
            <div
              key={clickIndicator.key}
              className="absolute pointer-events-none z-10"
              style={{
                left: clickIndicator.x - 20,
                top: clickIndicator.y - 20,
                width: 40,
                height: 40,
              }}
            >
              <div
                className="absolute inset-0 rounded-full border-2 border-[#E8913A]"
                style={{
                  animation: "click-ripple 0.8s ease-out forwards",
                }}
              />
              <div
                className="absolute rounded-full bg-[#E8913A]"
                style={{
                  width: 8,
                  height: 8,
                  left: 16,
                  top: 16,
                  animation: "click-dot 0.8s ease-out forwards",
                }}
              />
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={sandboxReady ? sandbox.sandbox_url : "about:blank"}
            className="w-full border-0 transition-opacity duration-500 ease-out"
            style={{
              height: "calc(100vh - 280px)",
              opacity: sandboxReady ? 1 : 0,
            }}
            title="Sandbox"
          />
        </CardContent>
      </Card>

      {/* Console log panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <button
          type="button"
          onClick={() => setLogExpanded(!logExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-[#1a1a1a] text-[#999] hover:text-[#ccc] text-xs font-mono border-t border-[#333] transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-[#666]">{logExpanded ? "v" : ">"}</span>
            Console
            {unseenLogCount > 0 && (
              <span className="bg-[#E8913A] text-white text-[10px] px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                {unseenLogCount}
              </span>
            )}
          </span>
          <span className="text-[#555]">{logEntries.length} entries</span>
        </button>
        {logExpanded && (
          <div className="h-48 overflow-y-auto bg-[#111] border-t border-[#222] font-mono text-xs p-2 space-y-px">
            {logEntries.length === 0 && (
              <p className="text-[#444] py-4 text-center">No log entries yet</p>
            )}
            {logEntries.map((entry, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  entry.type === "error"
                    ? "text-red-400"
                    : entry.type === "capture"
                    ? "text-green-400"
                    : entry.type === "replay"
                    ? "text-blue-400"
                    : "text-[#888]"
                }`}
              >
                <span className="text-[#555]">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>{" "}
                <span className="text-[#666]">[{entry.type}]</span> {entry.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
