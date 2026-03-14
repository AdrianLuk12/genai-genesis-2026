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

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
  parent_scenario_id: string | null;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configJson, setConfigJson] = useState("{}");

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
    if (!confirm("Delete this scenario?")) return;
    await api(`/api/scenarios/${id}`, { method: "DELETE" });
    setScenarios(scenarios.filter((s) => s.id !== id));
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scenarios</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Scenario"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createScenario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Low Inventory Test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Config JSON
                </label>
                <Textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder='{"product_count": 10, "inventory_status": "low"}'
                />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {scenarios.length === 0 ? (
        <p className="text-gray-500">
          No scenarios yet. Create one to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => (
            <Card key={sc.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{sc.name}</CardTitle>
                <CardDescription>
                  {sc.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-2 rounded mb-3 overflow-auto max-h-20">
                  {JSON.stringify(sc.config_json, null, 2)}
                </pre>
                <p className="text-xs text-gray-400 mb-3">
                  Created: {new Date(sc.created_at).toLocaleDateString()}
                  {sc.parent_scenario_id && " (from walkthrough)"}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => launchSandbox(sc.id)}
                    disabled={launching === sc.id}
                  >
                    {launching === sc.id ? "Launching..." : "Launch Sandbox"}
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
