"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-modal";
import { useEditName } from "@/components/ui/edit-name-modal";
import {
  Monitor,
  Play,
  Trash2,
  Save,
  ExternalLink,
  Pencil,
  Plus,
} from "lucide-react";

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
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/scenarios">
          <Button variant="onyx" size="sm">
            <Plus className="size-4" />
            New Sandbox
          </Button>
        </Link>
      </div>

      {/* Active Sandboxes Table */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Active Sandboxes
          </h2>
          <span className="text-xs text-muted-foreground">
            {sandboxes.length} {sandboxes.length === 1 ? "session" : "sessions"}
          </span>
        </div>

        <div className="bg-card border border-border overflow-hidden">
          {sandboxes.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Monitor className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No active sandboxes
              </p>
              <Link href="/scenarios">
                <Button variant="outline" size="sm">
                  Browse Scenarios
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Port</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Container</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sandboxes.map((sb) => (
                  <tr
                    key={sb.container_id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium hover:text-onyx-green transition-colors group"
                        onClick={() => renameSandbox(sb.container_id, sb.name || "")}
                      >
                        {sb.name || `Sandbox :${sb.port}`}
                        <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="success">
                        <span className="size-1.5 rounded-full bg-current mr-0.5" />
                        {sb.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      :{sb.port}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {sb.container_id.substring(0, 12)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/sandbox/${sb.container_id}`}>
                          <Button variant="ghost" size="icon-xs" title="View">
                            <ExternalLink className="size-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => saveSandbox(sb.container_id)}
                          title="Save State"
                        >
                          <Save className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => destroySandbox(sb.container_id)}
                          title="Destroy"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Launch */}
      {scenarios.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Quick Launch
            </h2>
            <Link href="/scenarios" className="text-xs text-onyx-green hover:underline">
              View all scenarios
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.slice(0, 3).map((sc) => (
              <div
                key={sc.id}
                className="bg-card border border-border p-5 hover:border-onyx-green/30 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-sm truncate">{sc.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3 line-clamp-2">
                  {sc.description || "No description"}
                </p>
                <Button
                  variant="onyx"
                  size="sm"
                  className="w-full"
                  onClick={() => launchSandbox(sc.id)}
                  disabled={launching === sc.id}
                >
                  {launching === sc.id ? (
                    <span className="dot-loading">
                      Launching<span>.</span><span>.</span><span>.</span>
                    </span>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      Launch
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
