"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-modal";

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
  parent_scenario_id: string | null;
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="border border-border/50 p-5 space-y-3 animate-fade-in-scale"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-5 w-3/4 skeleton-block" />
      <div className="h-3 w-1/2 skeleton-block" />
      <div className="h-16 w-full skeleton-block mt-2" />
      <div className="h-8 w-full skeleton-block mt-2" />
    </div>
  );
}

function LaunchOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const msgs = ["Provisioning sandbox", "Starting container", "Almost ready"];

  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => Math.min(i + 1, msgs.length - 1)), 3000);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div className="absolute inset-0 z-10 bg-card/85 backdrop-blur-[3px] flex flex-col items-center justify-center gap-4 animate-fade-in">
      <div className="w-24 h-px bg-border relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-foreground/50 animate-progress-fill" />
      </div>
      <p
        key={msgIndex}
        className="text-xs uppercase tracking-[0.15em] text-muted-foreground animate-fade-in"
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 skeleton-block animate-fade-in-up" />
          <div className="h-8 w-32 skeleton-block animate-fade-in-up" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} delay={i * 80} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-in-left">
        <h1 className="font-display font-bold text-3xl tracking-tight">
          Scenarios
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Scenario"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-border animate-fade-in-scale bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-display font-semibold">Create Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createScenario} className="space-y-4">
              <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Low Inventory Test"
                  className="transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(201,181,156,0.15)]"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(201,181,156,0.15)]"
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  Config JSON
                </label>
                <Textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={4}
                  className="font-mono text-sm transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(201,181,156,0.15)]"
                  placeholder='{"product_count": 10, "inventory_status": "low"}'
                />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scenario list */}
      {scenarios.length === 0 ? (
        <div className="border border-dashed border-border py-16 flex flex-col items-center gap-3 animate-fade-in">
          <p className="text-sm text-muted-foreground animate-breathing">
            No scenarios yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            Create one to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc, i) => (
            <Card
              key={sc.id}
              className="relative animate-fade-in-scale border-border group transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-px"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {launching === sc.id && <LaunchOverlay />}
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg font-semibold">
                  {sc.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {sc.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-[11px] font-mono bg-secondary/60 border border-border/30 p-2.5 mb-3 overflow-auto max-h-20 text-muted-foreground">
                  {JSON.stringify(sc.config_json, null, 2)}
                </pre>
                <p className="text-[10px] text-muted-foreground/60 mb-3 uppercase tracking-wider">
                  {new Date(sc.created_at).toLocaleDateString()}
                  {sc.parent_scenario_id && " / from walkthrough"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => launchSandbox(sc.id)}
                    disabled={launching === sc.id}
                  >
                    {launching === sc.id ? (
                      <span className="dot-loading">
                        Launching<span>.</span><span>.</span><span>.</span>
                      </span>
                    ) : (
                      "Launch"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteScenario(sc.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
