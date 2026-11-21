"use client";

import { GoalFormDialog } from "@/components/career/goal-form-dialog";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useCampus } from "@/hooks/use-campus";
import { useRouteQuery } from "@/hooks/use-route-query";
import { formatDateKey, relativeDayLabel } from "@/lib/dates";
import { GOAL_CATEGORY_LABEL, GOAL_STATUS_LABEL } from "@/lib/labels";
import type { CareerGoal, GoalCategory } from "@/types";
import { Plus, Target, TrendingUp, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const groups: GoalCategory[] = ["skill", "project", "internship", "certification", "portfolio", "milestone"];

export function CareerScreen() {
  const { data, deleteGoal } = useCampus();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CareerGoal | null>(null);
  const [pending, setPending] = useState<CareerGoal | null>(null);
  const now = useMemo(() => new Date(), []);
  useRouteQuery("/career", setQuery, () => {
    setEditing(null);
    setOpen(true);
  });
  if (!data) return null;
  const today = formatDateKey(now, data.profile.timezone);
  const q = query.trim().toLowerCase();
  const goals = data.goals.filter((goal) => !q || `${goal.title} ${goal.notes}`.toLowerCase().includes(q));
  const average = goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0;
  const upcoming = [...goals].filter((goal) => goal.status !== "completed").sort((a, b) => a.targetDate.localeCompare(b.targetDate)).slice(0, 4);

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader
        eyebrow="Career"
        title="Roadmap"
        description="Skills, projects, applications, and the next milestone. Progress is what you record."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Add goal</Button>}
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tracked goals" value={goals.length} hint="Across every category" icon={Target} accent="violet" />
        <StatCard label="Average progress" value={`${average}%`} hint="Mean across tracked goals" icon={TrendingUp} accent="teal" progress={average} />
        <StatCard label="Next milestone" value={upcoming[0]?.title ?? "None yet"} hint={upcoming[0] ? relativeDayLabel(upcoming[0].targetDate, today) : "Add a target date"} icon={Trophy} accent="warning" />
      </section>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search goals" aria-label="Search goals" className="h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {goals.length === 0 ? <EmptyState title="No career goals" body="Add a skill, project, or application to start the roadmap." action={<Button onClick={() => setOpen(true)}>Add goal</Button>} /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            {groups.map((category) => {
              const items = goals.filter((goal) => goal.category === category);
              if (items.length === 0) return null;
              return (
                <section key={category}>
                  <h2 className="text-sm font-semibold">{GOAL_CATEGORY_LABEL[category]}</h2>
                  <div className="mt-2 space-y-2">
                    {items.map((goal) => (
                      <article key={goal.id} className="cf-interactive rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold">{goal.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">Target {relativeDayLabel(goal.targetDate, today)} · {goal.targetDate}</p>
                          </div>
                          <Badge tone={goal.status === "completed" ? "ok" : goal.status === "in_progress" ? "info" : "neutral"}>{GOAL_STATUS_LABEL[goal.status]}</Badge>
                        </div>
                        {goal.notes ? <p className="mt-2 text-sm text-muted-foreground">{goal.notes}</p> : null}
                        <div className="mt-3 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${goal.progress}%` }} /></div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{goal.progress}%</span>
                          <span className="flex gap-2">
                            <button type="button" className="text-primary" onClick={() => { setEditing(goal); setOpen(true); }}>Edit</button>
                            <button type="button" className="text-primary" onClick={() => setPending(goal)}>Delete</button>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <aside className="h-fit rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Upcoming milestones</h2>
            <ol className="mt-3 space-y-3">
              {upcoming.map((goal) => (
                <li key={goal.id} className="border-l-2 border-primary pl-3">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">{GOAL_CATEGORY_LABEL[goal.category]} · {relativeDayLabel(goal.targetDate, today)} · {goal.progress}%</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
      <GoalFormDialog open={open} onOpenChange={setOpen} goal={editing} today={today} />
      <ConfirmDialog open={Boolean(pending)} onOpenChange={(next) => { if (!next) setPending(null); }} title="Delete goal" body={pending ? `Delete “${pending.title}”?` : ""} confirmLabel="Delete" onConfirm={() => { if (!pending) return; const target = pending; setPending(null); void deleteGoal(target.id).then(() => toast.success("Goal deleted")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not delete the goal")); }} />
    </div>
  );
}
