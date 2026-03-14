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

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  created_at: string;
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
    if (!confirm("Destroy this sandbox?")) return;
    await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
    setSandboxes(sandboxes.filter((s) => s.container_id !== containerId));
  }

  async function saveSandbox(containerId: string) {
    if (!confirm("Save walkthrough state? This will destroy the sandbox."))
      return;
    await api(`/api/sandboxes/${containerId}/save`, { method: "POST" });
    setSandboxes(sandboxes.filter((s) => s.container_id !== containerId));
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

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Sandboxes</h2>
        {sandboxes.length === 0 ? (
          <p className="text-gray-500">
            No active sandboxes.{" "}
            <Link href="/scenarios" className="text-blue-600 hover:underline">
              Browse scenarios
            </Link>{" "}
            to launch one.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sandboxes.map((sb) => (
              <Card key={sb.container_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    Sandbox :{sb.port}
                  </CardTitle>
                  <CardDescription>
                    Container: {sb.container_id.substring(0, 12)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{sb.status}</Badge>
                    <a
                      href={sb.sandbox_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {sb.sandbox_url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveSandbox(sb.container_id)}
                    >
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

      {scenarios.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Quick Launch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.slice(0, 3).map((sc) => (
              <Card key={sc.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{sc.name}</CardTitle>
                  <CardDescription>{sc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => launchSandbox(sc.id)}
                    disabled={launching === sc.id}
                  >
                    {launching === sc.id ? "Launching..." : "Launch Sandbox"}
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
