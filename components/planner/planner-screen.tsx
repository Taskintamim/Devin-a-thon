"use client";

import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/ui-bits";
import { useCampus } from "@/hooks/use-campus";
import { WEEKDAY_LABELS, addDaysToKey, formatDateKey, formatLongDate, formatMinutes, parseTimeToMinutes, startOfWeek, weekdayIndex, weekdayShort } from "@/lib/dates";
import { tasksMissingFromWeek, unscheduledReason } from "@/lib/planner/schedule";
import { fieldErrors, plannerSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function PlannerScreen() {
  const { data, updatePlanner, planDay, planWeek, toggleBlock, updateBlock, removeBlock, clearDay, setTaskStatus } = useCampus();
  const now = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!data) return null;
  const today = formatDateKey(now, data.profile.timezone);
  const active = selected ?? today;
  const weekStart = startOfWeek(active);
  const days = Array.from({ length: 7 }, (_, index) => addDaysToKey(weekStart, index));
  const dayBlocks = data.blocks.filter((block) => block.date === active).sort((a, b) => a.startMinutes - b.startMinutes);
  const missing = tasksMissingFromWeek({ tasks: data.tasks, blocks: data.blocks, weekStart, today });
  const studyDay = data.planner.studyDays.includes(weekdayIndex(active));

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    const parsed = plannerSchema.safeParse({
      studyStartTime: form.get("studyStartTime"),
      studyDurationHours: form.get("studyDurationHours"),
      breakMinutes: form.get("breakMinutes"),
      focusBlockMinutes: form.get("focusBlockMinutes"),
      studyDays: data.planner.studyDays,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    updatePlanner(parsed.data);
    setErrors({});
    toast.success("Study availability saved");
  }

  function saveBlockTime(id: string, startMinutes: number, endMinutes: number) {
    try {
      updateBlock(id, startMinutes, endMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the session");
    }
  }

  function toggleDay(day: number) {
    if (!data) return;
    const has = data.planner.studyDays.includes(day);
    const studyDays = has ? data.planner.studyDays.filter((item) => item !== day) : [...data.planner.studyDays, day].sort();
    if (studyDays.length === 0) {
      toast.error("Keep at least one study day.");
      return;
    }
    updatePlanner({ ...data.planner, studyDays });
    toast.success(has ? `${WEEKDAY_LABELS[day]} removed from study days` : `${WEEKDAY_LABELS[day]} added`);
  }

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader
        eyebrow="Smart Planner"
        title="Study window"
        description="Set when you can study. The scheduler places higher-priority unfinished tasks into open time, skips events, and will not put work after its deadline."
        actions={
          <>
            <Button variant="outline" onClick={() => { planDay(active); toast.success("Rebuilt this day from current tasks"); }}>Plan this day</Button>
            <Button onClick={() => { planWeek(weekStart); toast.success("Rebuilt this week"); }}>Plan this week</Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Availability</h2>
          <FormField label="Study start" error={errors.studyStartTime}>
            <Input name="studyStartTime" type="time" defaultValue={data.planner.studyStartTime} key={data.planner.studyStartTime} />
          </FormField>
          <FormField label="Duration (hours)" error={errors.studyDurationHours}>
            <Input name="studyDurationHours" type="number" min={1} max={14} step={0.5} defaultValue={data.planner.studyDurationHours} key={data.planner.studyDurationHours} />
          </FormField>
          <FormField label="Focus block (minutes)" error={errors.focusBlockMinutes}>
            <Input name="focusBlockMinutes" type="number" min={20} max={180} defaultValue={data.planner.focusBlockMinutes} key={data.planner.focusBlockMinutes} />
          </FormField>
          <FormField label="Break (minutes)" error={errors.breakMinutes}>
            <Input name="breakMinutes" type="number" min={0} max={60} defaultValue={data.planner.breakMinutes} key={data.planner.breakMinutes} />
          </FormField>
          <div>
            <p className="text-sm font-medium">Study days</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, index) => {
                const on = data.planner.studyDays.includes(index);
                return (
                  <button key={label} type="button" aria-pressed={on} onClick={() => toggleDay(index)} className={cn("rounded-lg border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit">Save availability</Button>
          <p className="text-xs leading-5 text-muted-foreground">Saving does not move existing blocks. Rebuild the day or week after you change hours.</p>
        </form>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(addDaysToKey(weekStart, -7))}>Previous week</Button>
            <p className="text-sm font-medium">{formatLongDate(weekStart)} – {formatLongDate(addDaysToKey(weekStart, 6))}</p>
            <Button variant="outline" size="sm" onClick={() => setSelected(addDaysToKey(weekStart, 7))}>Next week</Button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const count = data.blocks.filter((block) => block.date === day && block.kind === "task").length;
              const available = data.planner.studyDays.includes(weekdayIndex(day));
              return (
                <button key={day} type="button" onClick={() => setSelected(day)} className={cn("rounded-lg border px-1 py-2 text-center", active === day ? "border-primary bg-primary/10" : "border-border", !available && "opacity-50")}>
                  <span className="block text-[11px] text-muted-foreground">{weekdayShort(day)}</span>
                  <span className="block text-sm font-medium">{day.slice(8)}</span>
                  <span className="block text-[10px] text-muted-foreground">{available ? `${count} tasks` : "Off"}</span>
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{formatLongDate(active)}</h2>
              <Button size="sm" variant="ghost" onClick={() => { clearDay(active); toast.success("Cleared this day"); }}>Clear day</Button>
            </div>
            {!studyDay ? <p className="mt-3 text-sm text-muted-foreground">This day is marked unavailable. Turn it on if you want blocks here.</p> : null}
            {studyDay && dayBlocks.length === 0 ? <div className="mt-3"><EmptyState title="No plan for this day" body="Plan this day to place the highest-priority tasks that still fit the window." /></div> : null}
            <ol className="mt-3 space-y-2">
              {dayBlocks.map((block) => (
                <li key={block.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2", block.kind === "break" && "bg-secondary/50", block.kind === "commitment" && "bg-secondary/40")}>
                  <span className="w-32 text-xs text-muted-foreground">{formatMinutes(block.startMinutes)}–{formatMinutes(block.endMinutes)}</span>
                  <span className="min-w-40 flex-1">
                    <span className={cn("block text-sm", block.completed && "line-through text-muted-foreground")}>{block.title}</span>
                    {block.note ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{block.note}</span> : null}
                  </span>
                  {block.kind === "task" ? (
                    <>
                      <label className="text-[11px] text-muted-foreground">
                        Start
                        <input
                          type="time"
                          aria-label={`Start time for ${block.title}`}
                          defaultValue={toTimeValue(block.startMinutes)}
                          key={`${block.id}-start-${block.startMinutes}`}
                          className="ml-1 rounded border border-border bg-background px-1 py-0.5 text-xs"
                          onBlur={(event) => saveBlockTime(block.id, parseTimeToMinutes(event.target.value), block.endMinutes)}
                        />
                      </label>
                      <label className="text-[11px] text-muted-foreground">
                        End
                        <input
                          type="time"
                          aria-label={`End time for ${block.title}`}
                          defaultValue={toTimeValue(block.endMinutes)}
                          key={`${block.id}-end-${block.endMinutes}`}
                          className="ml-1 rounded border border-border bg-background px-1 py-0.5 text-xs"
                          onBlur={(event) => saveBlockTime(block.id, block.startMinutes, parseTimeToMinutes(event.target.value))}
                        />
                      </label>
                      <button type="button" className="text-xs text-primary" onClick={() => toggleBlock(block.id)}>
                        {block.completed ? "Mark open" : "Mark session done"}
                      </button>
                    </>
                  ) : <span className="text-xs text-muted-foreground">{block.kind === "break" ? "Break" : block.kind === "commitment" ? "Commitment" : "Open"}</span>}
                  {block.taskId ? (
                    <>
                      <Link href={`/tasks?q=${encodeURIComponent(block.title)}`} className="text-xs text-primary">Open task</Link>
                      <button type="button" className="text-xs text-primary" onClick={() => { void setTaskStatus(block.taskId!, "completed").then(() => toast.success("Task completed")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not complete the task")); }}>
                        Complete task
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="text-xs text-muted-foreground" onClick={() => removeBlock(block.id)}>Remove</button>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Didn&apos;t fit this week</h2>
            {missing.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Every open task due this week has at least one block, or nothing is due.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {missing.map((task) => (
                  <li key={task.id}>{task.title} · {unscheduledReason(task, today)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toTimeValue(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
