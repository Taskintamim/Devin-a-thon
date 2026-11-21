"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { useState } from "react";
import { toast } from "sonner";

export function NotionPanel() {
  const { data, setupNotion, syncFromNotion, returnToDemo } = useCampus();
  const [parentPageId, setParentPageId] = useState(data?.notion.parentPageId ?? "");
  const [status, setStatus] = useState("Not checked yet.");
  const [busy, setBusy] = useState<"test" | "setup" | "sync" | null>(null);
  if (!data) return null;
  const sources = data.notion;
  const connected = data.mode === "notion" && !sources.lastError;

  async function run(kind: "test" | "setup" | "sync", action: () => Promise<string>) {
    setBusy(kind);
    try {
      const message = await action();
      setStatus(message);
      toast.success(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notion request failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="notion" className="max-w-3xl rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Notion</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
          {busy ? "Synchronizing" : sources.lastError ? "Sync failed" : connected ? "Connected" : "Local workspace"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {data.mode === "notion"
          ? "This workspace is showing the last successful Notion pull. Local edits in this mode are written to Notion. Your previous local copy is stored separately and is not mixed in."
          : "Local workspace is active. Nothing is sent to Notion until you set up a workspace and pull."}
      </p>
      {sources.lastSyncAt ? <p className="mt-2 text-xs text-muted-foreground">Last successful pull: {sources.lastSyncAt}</p> : null}
      {sources.lastError ? <p className="mt-2 text-sm text-destructive">{sources.lastError}</p> : null}

      <ol className="mt-4 list-decimal space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
        <li>Create an internal integration at notion.so/my-integrations and copy the secret into <code>NOTION_API_KEY</code> on the server.</li>
        <li>Create a parent page in Notion and share it with the integration.</li>
        <li>Paste that page ID below, or set <code>NOTION_PARENT_PAGE_ID</code>.</li>
        <li>Run workspace setup. Running it again reuses databases named CampusFlow Tasks, Courses, Events, and Career.</li>
        <li>Pull from Notion. That replaces the connected workspace. Your local copy is kept until you switch back.</li>
      </ol>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block text-muted-foreground">Parent page ID</span>
        <Input value={parentPageId} onChange={(event) => setParentPageId(event.target.value.trim())} placeholder="From the Notion page URL" />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy !== null} onClick={() => void run("test", async () => {
          const response = await fetch(`/api/notion/status?parentPageId=${encodeURIComponent(parentPageId)}`);
          const body = (await response.json()) as { message?: string };
          if (!response.ok) throw new Error(body.message || "Connection test failed.");
          return body.message || "Checked.";
        })}>
          {busy === "test" ? "Checking…" : "Test connection"}
        </Button>
        <Button variant="secondary" disabled={busy !== null} onClick={() => void run("setup", () => setupNotion(parentPageId))}>
          {busy === "setup" ? "Setting up…" : "Set up databases"}
        </Button>
        <Button disabled={busy !== null} onClick={() => void run("sync", () => syncFromNotion())}>
          {busy === "sync" ? "Pulling…" : "Pull from Notion"}
        </Button>
        {data.mode === "notion" ? (
          <Button variant="outline" onClick={() => { returnToDemo(); toast.success("Switched back to the saved local workspace."); }}>
            Use local workspace
          </Button>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Tasks: {sources.tasksDataSourceId || "not configured"}</div>
        <div>Courses: {sources.coursesDataSourceId || "not configured"}</div>
        <div>Events: {sources.eventsDataSourceId || "not configured"}</div>
        <div>Career: {sources.careerDataSourceId || "not configured"}</div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">The integration secret is never shown here. Pull uses Notion as the source of truth and replaces the connected copy. It does not merge with local records.</p>
      <p className="mt-2 text-sm">{status}</p>
    </section>
  );
}
