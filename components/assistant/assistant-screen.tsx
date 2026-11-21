"use client";

import { Button } from "@/components/ui/button";
import { useCampus } from "@/hooks/use-campus";
import { answerWithRules } from "@/lib/assistant/engine";
import type { AssistantSnapshot } from "@/types";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const prompts = [
  "What should I work on today?",
  "Which assignments are overdue?",
  "What deadlines do I have this week?",
  "Help me prepare a study plan.",
  "Which tasks should I prioritize?",
];

export function AssistantScreen() {
  const { data, appendExchange, clearMessages } = useCampus();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length, pending]);

  if (!data) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || !data || pending) return;
    setPending(true);
    setDraft("");
    const snapshot = toSnapshot(data);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, snapshot }),
      });
      const payload = (await response.json()) as { reply?: { content: string }; error?: string };
      if (!response.ok || !payload.reply?.content) throw new Error(payload.error || "Assistant request failed");
      appendExchange(message, payload.reply.content);
    } catch {
      const local = answerWithRules(message, snapshot, new Date());
      appendExchange(message, local.content);
      toast.message("Answered on this device", { description: "The assistant route did not respond, so the local rules engine answered." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="cf-fade flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <MessageCircle className="size-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Student Assistant</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Ask about your actual workload</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Answers use your tasks, courses, and goals{data.profile.university ? ` at ${data.profile.university}` : ""}. Rules-based — no language model is connected.
          </p>
        </div>
        <Button variant="outline" onClick={() => clearMessages()} disabled={data.messages.length === 0}>Clear</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-secondary" onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Try one of the prompts. Replies list real items from your workspace.</p>
        ) : null}
        {data.messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "cf-pop ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground" : "cf-pop max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2 text-sm"}>
            {message.content}
          </div>
        ))}
        {pending ? <p className="text-xs text-muted-foreground">Checking your tasks…</p> : null}
        <div ref={bottom} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about today, overdue work, or this week"
          aria-label="Message"
          className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={pending || !draft.trim()}>Send</Button>
      </form>
    </div>
  );
}

function toSnapshot(data: NonNullable<ReturnType<typeof useCampus>["data"]>): AssistantSnapshot {
  return {
    profile: data.profile,
    courses: data.courses,
    tasks: data.tasks,
    events: data.events,
    responsibilities: data.responsibilities,
    goals: data.goals,
    planner: data.planner,
    blocks: data.blocks,
  };
}
