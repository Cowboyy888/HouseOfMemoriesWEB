"use client";

import { BrainCircuit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { env } from "@/lib/env";

function statusTone(status: string) {
  switch (status) {
    case "ready":
      return "text-emerald-600";
    case "degraded":
      return "text-amber-600";
    default:
      return "text-slate-600";
  }
}

type RecentAiActivity = {
  id: string;
  module: string;
  provider: string | null;
  succeeded: boolean;
  responseSummary: string | null;
  promptSummary: string;
  createdAt: string;
};

export function AiStatusCard() {
  const [status, setStatus] = useState<"ready" | "degraded" | "offline">("offline");
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentAiActivity[]>([]);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const [response, activity] = await Promise.all([
          fetch(`${env.apiUrl}/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: "Status check" }] }),
            credentials: "include",
          }),
          apiFetch<{ items: RecentAiActivity[] }>("/ai/logs?limit=3").catch(() => ({ items: [] })),
        ]);

        if (active) {
          setStatus(response.ok ? "ready" : "degraded");
          setRecentActivity(activity.items ?? []);
        }
      } catch {
        if (active) {
          setStatus("offline");
          setRecentActivity([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">AI assistant status</p>
          <p className="mt-1 text-sm text-muted-foreground">The admin view reflects whether the assistant endpoint is responsive.</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BrainCircuit className="size-4" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <span className={`h-2.5 w-2.5 rounded-full ${status === "ready" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-slate-400"}`} />
              <span className={statusTone(status)}>{status === "ready" ? "Operational" : status === "degraded" ? "Needs attention" : "Offline"}</span>
            </>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Recent AI activity</p>
            <span className="text-xs text-muted-foreground">Last 3 requests</span>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No recent activity recorded yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {recentActivity.map((item) => (
                <li key={item.id} className="rounded-md border bg-background/70 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.module.replace(/_/g, " ").toLowerCase()}</span>
                    <span className={item.succeeded ? "text-emerald-600" : "text-rose-600"}>
                      {item.succeeded ? "ok" : "failed"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.responseSummary ?? item.promptSummary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
