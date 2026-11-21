"use client";

import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { EventFormDialog } from "@/components/campus/event-form-dialog";
import { AnimatedCard, Badge, EmptyState, PageHeader, PriorityBadge, SectionHeader, StatCard, StatusBadge } from "@/components/shared/ui-bits";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { useCampus } from "@/hooks/use-campus";
import { formatMinutes, formatShortDate, relativeDayLabel } from "@/lib/dates";
import { buildInsights } from "@/lib/insights";
import { courseCode } from "@/lib/labels";
import { formatDuration } from "@/lib/utils";
import type { Task } from "@/types";
import { AlertTriangle, CalendarClock, Check, ClipboardList, Clock, FileText, ListTodo, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";

const FALLBACK_BAR = "#6366f1";

export function DashboardScreen() {
  const { data, setTaskStatus } = useCampus();
  const { resolvedTheme } = useTheme();
  const [taskOpen, setTaskOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const now = useMemo(() => new Date(), []);
  if (!data) return null;
  const insights = buildInsights(data, now);
  const tick = resolvedTheme === "light" ? "#526277" : "#93a0b8";
  const grid = resolvedTheme === "light" ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)";
  const todayBlocks = [...data.blocks]
    .filter((block) => block.date === insights.todayKey)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  const profileLine = [data.profile.name || "Student", data.profile.university || "University", data.profile.semester || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="cf-stagger space-y-6">
      <section className="cf-rise">
        <PageHeader
          eyebrow={`${data.profile.semester || "Semester"} · ${insights.dateLabel}`}
          title={insights.greeting}
          description={`${profileLine} · ${data.profile.timezone}`}
          actions={
            <>
              <Button onClick={() => { setEditing(null); setTaskOpen(true); }}>
                <Plus className="size-4" /> Task
              </Button>
              <Button variant="outline" onClick={() => setCourseOpen(true)}>
                <Plus className="size-4" /> Course
              </Button>
              <Button variant="outline" onClick={() => setEventOpen(true)}>
                <Plus className="size-4" /> Event
              </Button>
            </>
          }
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active tasks" value={insights.activeCount} hint={`${insights.completedCount} completed all time`} icon={ListTodo} accent="violet" />
        <StatCard label="Overdue" value={insights.overdue.length} hint={insights.overdue.length ? "Past the deadline date" : "All caught up"} icon={AlertTriangle} accent={insights.overdue.length ? "danger" : "success"} />
        <StatCard label="Pending assignments" value={insights.pendingAssignments} hint={insights.examsAhead.length ? `${insights.examsAhead.length} exam(s) ahead` : "No exams scheduled"} icon={FileText} accent="warning" />
        <StatCard label="Study this week" value={`${insights.study.percent}%`} hint={`${formatDuration(insights.study.completedMinutes)} of ${formatDuration(insights.study.plannedMinutes)} planned`} icon={Clock} accent="teal" progress={insights.study.percent} />
      </section>

      <AnimatedCard className="cf-rise p-5">
        <SectionHeader title="Workload analysis" description={`Personal report for ${data.profile.name || "you"} at ${data.profile.university || "your university"}`} />
        <p className="mt-3 text-base font-medium">{insights.analysis.headline}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground">{insights.analysis.workload}</p>
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground">{insights.analysis.progress}</p>
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground">{insights.analysis.focus}</p>
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm leading-6 text-muted-foreground">{insights.analysis.risk}</p>
        </div>
      </AnimatedCard>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="cf-rise rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <ClipboardList className="size-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Smart Daily Brief</p>
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight">{insights.brief.headline}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{insights.brief.summary}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BriefList title="Needs attention" items={insights.brief.attention} />
            <BriefList title="Approaching" items={insights.brief.approaching} />
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Why these come first</p>
            {insights.brief.priorities.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks to rank.</p> : null}
            {insights.brief.priorities.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <Badge tone="violet">Score {item.score}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.why}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.deadline} · {item.duration} · {item.band}</p>
              </div>
            ))}
          </div>
          <p className="cf-tnum mt-4 text-xs text-muted-foreground">Study capacity: {insights.brief.capacity}</p>
          {insights.brief.conflicts.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-300">
              {insights.brief.conflicts.map((conflict) => (
                <li key={conflict}>{conflict}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <AnimatedCard className="cf-rise p-5">
          <SectionHeader title="Today's priorities" action={<Link href="/tasks" className="text-xs font-medium text-primary hover:underline">All tasks</Link>} />
          <div className="mt-3 space-y-2">
            {insights.priorities.length === 0 ? <EmptyState icon={ListTodo} title="Nothing to rank" body="Add a task and it will show up here by deadline and priority." /> : null}
            {insights.priorities.map((item) => (
              <div key={item.task.id} className="group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40">
                <button
                  type="button"
                  aria-label={`Complete ${item.task.title}`}
                  className="mt-0.5 flex size-5 items-center justify-center rounded border border-border transition-colors hover:border-primary hover:bg-primary/10"
                  onClick={() => { void setTaskStatus(item.task.id, "completed").catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not complete the task")); }}
                >
                  <Check className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" className="truncate text-left text-sm font-medium transition-colors hover:text-primary" onClick={() => { setEditing(item.task); setTaskOpen(true); }}>
                    {item.task.title}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {courseCode(data.courses, item.task.courseId)} · {relativeDayLabel(item.task.deadlineDate, insights.todayKey)} {item.task.deadlineTime} · {formatDuration(item.task.estimatedMinutes)}
                  </p>
                </div>
                <PriorityBadge priority={item.task.priority} />
              </div>
            ))}
          </div>
        </AnimatedCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <AnimatedCard className="cf-rise p-5">
          <SectionHeader title="Today's schedule" description={`Study window from ${formatMinutes(Number(data.planner.studyStartTime.slice(0, 2)) * 60 + Number(data.planner.studyStartTime.slice(3)))}`} action={<Link href="/planner" className="text-xs font-medium text-primary hover:underline">Planner</Link>} />
          <div className="mt-3 space-y-2">
            {todayBlocks.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No blocks today" body="Open the planner to generate a focused schedule from your tasks." action={<Button variant="outline" size="sm" asChild><Link href="/planner">Open planner</Link></Button>} />
            ) : (
              todayBlocks.map((block) => (
                <div key={block.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="cf-tnum w-24 shrink-0 text-xs font-medium text-muted-foreground">{formatMinutes(block.startMinutes)}–{formatMinutes(block.endMinutes)}</span>
                  <span className={`size-2 shrink-0 rounded-full ${block.kind === "break" ? "bg-emerald-500" : block.kind === "commitment" ? "bg-orange-500" : "bg-blue-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm">{block.title}</span>
                </div>
              ))
            )}
          </div>
        </AnimatedCard>

        <AnimatedCard className="cf-rise p-5">
          <SectionHeader title="Upcoming deadlines" description="Assignments, exams, and projects still open" />
          <div className="mt-3 divide-y divide-border">
            {insights.upcomingDeadlines.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No assignments, exams, or projects are open.</p> : null}
            {insights.upcomingDeadlines.map((task) => {
              const overdue = task.deadlineDate < insights.todayKey;
              const today = task.deadlineDate === insights.todayKey;
              return (
                <div key={task.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="cf-tnum text-xs text-muted-foreground">{courseCode(data.courses, task.courseId)} · {formatShortDate(task.deadlineDate)} {task.deadlineTime}</p>
                  </div>
                  <StatusBadge status={task.status} />
                  <Badge tone={overdue ? "critical" : today ? "high" : "neutral"}>{overdue ? "Overdue" : today ? "Today" : relativeDayLabel(task.deadlineDate, insights.todayKey)}</Badge>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AnimatedCard interactive={false} className="cf-rise p-5">
          <SectionHeader title="Weekly completion" description="Tasks completed in the last 7 days" />
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={insights.weekly}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} content={<ChartTip />} />
                <Bar dataKey="completed" name="Completed" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  {insights.weekly.map((day) => (
                    <Cell key={day.key} fill={day.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
        <AnimatedCard interactive={false} className="cf-rise p-5">
          <SectionHeader title="Task categories" description="Open work by category" />
          <div className="mt-3 h-56">
            {insights.categoryMix.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks yet.</p> : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={insights.categoryMix}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: tick, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} content={<ChartTip />} />
                  <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {insights.categoryMix.map((slice) => (
                      <Cell key={slice.name} fill={slice.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnimatedCard>
        <AnimatedCard interactive={false} className="cf-rise p-5">
          <SectionHeader title="Completed vs open" description={`${insights.study.percent}% of planned study logged`} />
          <div className="mt-3 h-48">
            {insights.statusMix.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={insights.statusMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={4} stroke="none">
                    {insights.statusMix.map((slice) => (
                      <Cell key={slice.name} fill={slice.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {insights.statusMix.map((slice) => (
              <span key={slice.name} className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: slice.fill }} />
                {slice.name} {slice.value}
              </span>
            ))}
          </div>
        </AnimatedCard>
        <AnimatedCard interactive={false} className="cf-rise p-5">
          <SectionHeader title="Course activity" description="Task count by course" />
          <div className="mt-3 h-56">
            {insights.courseActivity.length === 0 ? <p className="text-sm text-muted-foreground">Add a course and a task to see this chart.</p> : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={insights.courseActivity} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke={grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="code" tick={{ fill: tick, fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} content={<ChartTip />} />
                  <Bar dataKey="tasks" name="Tasks" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {insights.courseActivity.map((course) => (
                      <Cell key={course.code} fill={course.fill || FALLBACK_BAR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnimatedCard>
      </section>

      <TaskFormDialog open={taskOpen} onOpenChange={setTaskOpen} task={editing} today={insights.todayKey} />
      <CourseFormDialog open={courseOpen} onOpenChange={setCourseOpen} course={null} />
      <EventFormDialog open={eventOpen} onOpenChange={setEventOpen} event={null} today={insights.todayKey} />
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-5">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      {label ? <p className="mb-1 text-muted-foreground">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name}>{item.name}: {item.value}</p>
      ))}
    </div>
  );
}
