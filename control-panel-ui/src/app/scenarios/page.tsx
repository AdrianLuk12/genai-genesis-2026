"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  FlaskConical,
  Play,
  Trash2,
  Plus,
  X,
  Search,
  GitBranch,
} from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
  parent_scenario_id: string | null;
}

function LaunchOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const msgs = ["Provisioning sandbox", "Starting container", "Almost ready"];

  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => Math.min(i + 1, msgs.length - 1)), 3000);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div className="absolute inset-0 z-10 bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in rounded-none">
      <div className="w-24 h-1 bg-border relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-onyx-green animate-progress-fill" />
      </div>
      <p
        key={msgIndex}
        className="text-xs text-muted-foreground animate-fade-in"
      >
        {msgs[msgIndex]}
        <span className="dot-loading">
          <span className="inline-block">.</span>
          <span className="inline-block">.</span>
          <span className="inline-block">.</span>
        </span>
      </p>
    </div>
  );
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configJson, setConfigJson] = useState("{}");
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();

  useEffect(() => {
    loadScenarios();
  }, []);

  async function loadScenarios() {
    setLoading(true);
    try {
      const data = await api("/api/scenarios");
      setScenarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createScenario(e: React.FormEvent) {
    e.preventDefault();
    try {
      const parsed = JSON.parse(configJson);
      await api("/api/scenarios", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          config_json: parsed,
        }),
      });
      setName("");
      setDescription("");
      setConfigJson("{}");
      setShowForm(false);
      loadScenarios();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create scenario");
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

  async function deleteScenario(id: string) {
    const ok = await confirm({
      title: "Delete Scenario",
      description: "This scenario will be permanently removed. Any sandboxes launched from it will not be affected.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/scenarios/${id}`, { method: "DELETE" });
    setScenarios(scenarios.filter((s) => s.id !== id));
  }

  const filtered = scenarios.filter(
    (sc) =>
      sc.name.toLowerCase().includes(search.toLowerCase()) ||
      sc.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-12 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold">Scenarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure and manage test scenarios
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "onyx"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            <>
              <X className="size-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="size-4" />
              New Scenario
            </>
          )}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-card rounded-none border border-border p-6 animate-fade-in-scale">
          <h3 className="font-semibold mb-4">Create Scenario</h3>
          <form onSubmit={createScenario} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Low Inventory Test"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Config JSON
              </label>
              <Textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={4}
                className="font-mono text-xs"
                placeholder='{"product_count": 10, "inventory_status": "low"}'
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="onyx">Create Scenario</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenarios..."
            className="pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {scenarios.length} scenarios
        </span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-none border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <FlaskConical className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {scenarios.length === 0 ? "No scenarios yet" : "No matches found"}
            </p>
            {scenarios.length === 0 && (
              <p className="text-xs text-muted-foreground/60">
                Create one to get started
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Config</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Created</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sc) => (
                <tr
                  key={sc.id}
                  className="relative border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  {launching === sc.id && (
                    <td colSpan={5} className="absolute inset-0">
                      <LaunchOverlay />
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/scenarios/${sc.id}`}
                        className="font-medium hover:text-onyx-green transition-colors"
                      >
                        {sc.name}
                      </Link>
                      {sc.parent_scenario_id && (
                        <Badge variant="secondary" className="text-[10px]">
                          <GitBranch className="size-2.5 mr-0.5" />
                          walkthrough
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                    {sc.description || "---"}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 max-w-[160px] truncate block">
                      {JSON.stringify(sc.config_json)}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(sc.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => launchSandbox(sc.id)}
                        disabled={launching === sc.id}
                        title="Launch"
                        className="text-onyx-green hover:text-onyx-green hover:bg-onyx-green/10"
                      >
                        <Play className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteScenario(sc.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
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
  );
}
