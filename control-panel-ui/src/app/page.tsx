"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="border border-border/50 p-5 space-y-3 animate-fade-in-scale"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-5 w-2/3 skeleton-block" />
      <div className="h-3 w-1/2 skeleton-block" />
      <div className="h-8 w-full skeleton-block mt-4" />
    </div>
  );
}

export default function DashboardPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const editName = useEditName();

  useEffect(() => {
    Promise.all([api("/api/sandboxes"), api("/api/scenarios")])
      .then(([sbs, scs]) => {
        setSandboxes(sbs);
        setScenarios(scs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function destroySandbox(containerId: string) {
    const ok = await confirm({
      title: "Destroy Sandbox",
      description: "This sandbox will be permanently removed. This action cannot be undone.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
    setSandboxes(sandboxes.filter((s) => s.container_id !== containerId));
  }

  async function saveSandbox(containerId: string) {
    const ok = await confirm({
      title: "Save Walkthrough State",
      description: "The current state will be saved as a new scenario. The sandbox will be destroyed after saving.",
      confirmText: "Save State",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}/save`, { method: "POST" });
    setSandboxes(sandboxes.filter((s) => s.container_id !== containerId));
  }

  async function renameSandbox(containerId: string, currentName: string) {
    const newName = await editName({
      title: "Rename Sandbox",
      currentName,
    });
    if (newName === null) return;
    const prev = sandboxes.map((s) => ({ ...s }));
    setSandboxes((sbs) =>
      sbs.map((s) =>
        s.container_id === containerId ? { ...s, name: newName || null } : s
      )
    );
    try {
      await api(`/api/sandboxes/${containerId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      });
    } catch {
      setSandboxes(prev);
    }
  }

  async function launchSandbox(scenarioId: string) {
    setLaunching(scenarioId);
    try {
      const result = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      window.location.href = `/sandbox/${result.container_id}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Launch failed");
      setLaunching(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 skeleton-block animate-fade-in-up" />
        <div>
          <div className="h-5 w-36 skeleton-block mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} delay={i * 80} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Page title */}
      <h1 className="font-display font-bold text-3xl tracking-tight animate-slide-in-left">
        Dashboard
      </h1>

      {/* Active Sandboxes */}
      <section className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
          Active Sandboxes
        </h2>

        {sandboxes.length === 0 ? (
          <div className="border border-dashed border-border py-12 flex flex-col items-center gap-3 animate-fade-in">
            <p className="text-sm text-muted-foreground animate-breathing">
              No active sandboxes
            </p>
            <Link href="/scenarios">
              <Button variant="outline" size="sm">
                Browse Scenarios
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sandboxes.map((sb, i) => (
              <Card
                key={sb.container_id}
                className="animate-fade-in-scale border-border group transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg font-semibold flex items-center gap-2">
                    <span className="size-2 bg-green-500/70 inline-block" />
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground/70 transition-colors duration-200 text-left"
                      onClick={() => renameSandbox(sb.container_id, sb.name || "")}
                    >
                      {sb.name || `Sandbox :${sb.port}`}
                      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity duration-200" />
                    </button>
                  </CardTitle>
                  <CardDescription className="text-xs font-mono text-muted-foreground">
                    :{sb.port} / {sb.container_id.substring(0, 12)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {sb.status}
                    </Badge>
                    <a
                      href={sb.sandbox_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 truncate"
                    >
                      {sb.sandbox_url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveSandbox(sb.container_id)}>
                      Save State
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => destroySandbox(sb.container_id)}
                    >
                      Destroy
                    </Button>
                    <Link href={`/sandbox/${sb.container_id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick Launch */}
      {scenarios.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
            Quick Launch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.slice(0, 3).map((sc, i) => (
              <Card
                key={sc.id}
                className="animate-fade-in-scale border-border group transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-px h-full"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg font-semibold">
                    {sc.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sc.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button
                    className="w-full"
                    onClick={() => launchSandbox(sc.id)}
                    disabled={launching === sc.id}
                  >
                    {launching === sc.id ? (
                      <span className="dot-loading">
                        Launching
                        <span>.</span><span>.</span><span>.</span>
                      </span>
                    ) : (
                      "Launch Sandbox"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
