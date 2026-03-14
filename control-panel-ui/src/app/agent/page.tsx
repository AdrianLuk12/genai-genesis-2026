"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Monitor, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  name: string | null;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  app_version_id: string | null;
}

interface App {
  id: string;
  name: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version_tag: string;
}

export default function AgentPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [intent, setIntent] = useState("");

  useEffect(() => {
    Promise.all([api("/api/sandboxes"), api("/api/scenarios"), api("/api/apps")])
      .then(async ([sbs, scs, aps]) => {
        setSandboxes(sbs);
        setScenarios(scs);
        setApps(aps);
        const allVersions: AppVersion[] = [];
        for (const app of aps) {
          const vers = await api(`/api/apps/${app.id}/versions`);
          allVersions.push(...vers);
        }
        setVersions(allVersions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function launchWithAgent() {
    if (!selectedScenario || !intent.trim()) return;
    setLaunching(true);
    try {
      const result = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: selectedScenario }),
      });
      // Navigate to sandbox with agent intent as query param
      window.location.href = `/sandbox/${result.container_id}?agent=${encodeURIComponent(intent)}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Launch failed");
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-48 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold">AI Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Describe a task in natural language and the agent will navigate the sandbox autonomously.
        </p>
      </div>

      {/* New agent task */}
      <div className="bg-card border border-border p-6 space-y-5 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <h2 className="text-sm font-semibold">New Agent Task</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Scenario</label>
          <select
            className="w-full h-9 px-3 text-sm border border-input bg-card text-foreground outline-none focus:border-ring"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
          >
            <option value="">Select a scenario...</option>
            {apps.map((app) => {
              const appVersions = versions.filter((v) => v.app_id === app.id);
              return appVersions.map((ver) => {
                const verScenarios = scenarios.filter((s) => s.app_version_id === ver.id);
                if (verScenarios.length === 0) return null;
                return (
                  <optgroup key={ver.id} label={`${app.name} — ${ver.version_tag}`}>
                    {verScenarios.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </optgroup>
                );
              });
            })}
            {scenarios.filter((s) => !s.app_version_id).length > 0 && (
              <optgroup label="Unscoped Scenarios">
                {scenarios.filter((s) => !s.app_version_id).map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} {sc.description ? `— ${sc.description}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Task Description</label>
          <div className="relative">
            <Bot className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Add the cheapest electronics product to the cart and go to checkout"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") launchWithAgent();
              }}
            />
          </div>
        </div>

        <Button
          variant="onyx"
          onClick={launchWithAgent}
          disabled={!selectedScenario || !intent.trim() || launching}
          className="gap-2"
        >
          {launching ? (
            <span className="dot-loading">
              Launching<span>.</span><span>.</span><span>.</span>
            </span>
          ) : (
            <>
              <Play className="size-4" />
              Launch & Run Agent
            </>
          )}
        </Button>
      </div>

      {/* Active sandboxes with agent available */}
      {sandboxes.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-sm font-semibold mb-3">
            Or run agent on an active sandbox
          </h2>
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Session</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Port</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {sandboxes.map((sb) => (
                  <tr
                    key={sb.container_id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium">
                      {sb.name || `Sandbox :${sb.port}`}
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
                    <td className="py-3 px-4 text-right">
                      <Link href={`/sandbox/${sb.container_id}`}>
                        <Button variant="outline" size="xs" className="gap-1">
                          Open
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
