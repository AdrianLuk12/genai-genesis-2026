"use client";

import { useEffect, useState, useCallback } from "react";
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
      {/* Subtle scan line overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #C9B59C 2px, #C9B59C 3px)",
        }} />
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#C9B59C]/10 to-transparent animate-scan-line"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Title */}
        <div className="animate-fade-in-up">
          <h2 className="font-display font-bold text-2xl tracking-[0.2em] uppercase text-foreground/80">
            Initializing
          </h2>
        </div>

        {/* Progress bar */}
        <div className="w-64 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="h-px bg-border w-full relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-foreground/60 animate-progress-fill" />
          </div>
        </div>

        {/* Status message */}
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

  useEffect(() => {
    api("/api/sandboxes")
      .then((sandboxes: Sandbox[]) => {
        const found = sandboxes.find((s) => s.container_id === containerId);
        setSandbox(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [containerId]);

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
      description: "The current state will be saved as a new scenario. The sandbox will be destroyed after saving.",
      confirmText: "Save State",
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api(`/api/sandboxes/${containerId}/save`, { method: "POST" });
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveState} disabled={actionLoading}>
            Save Walkthrough State
          </Button>
          <Button
            variant="destructive"
            onClick={destroySandbox}
            disabled={actionLoading}
          >
            Destroy Sandbox
          </Button>
        </div>
      </div>

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

          <iframe
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
    </div>
  );
}
