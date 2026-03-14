"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  created_at: string;
}

export default function SandboxViewPage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id as string;

  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/api/sandboxes")
      .then((sandboxes: Sandbox[]) => {
        const found = sandboxes.find((s) => s.container_id === containerId);
        setSandbox(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [containerId]);

  async function saveState() {
    if (!confirm("Save walkthrough state? This will destroy the sandbox after saving.")) return;
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
    if (!confirm("Destroy this sandbox? This cannot be undone.")) return;
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

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!sandbox) return <p className="text-red-500">Sandbox not found.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          Sandbox :{sandbox.port}
        </h1>
        <div className="flex gap-2">
          <Button onClick={saveState} disabled={actionLoading}>
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

      {message && (
        <Card className="mb-4">
          <CardContent className="py-3">
            <p>{message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500">
            Container: {sandbox.container_id.substring(0, 12)} | URL:{" "}
            <a
              href={sandbox.sandbox_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {sandbox.sandbox_url}
            </a>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={sandbox.sandbox_url}
            className="w-full border-0"
            style={{ height: "calc(100vh - 250px)" }}
            title="Sandbox"
          />
        </CardContent>
      </Card>
    </div>
  );
}
