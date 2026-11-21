"use client";

import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState, PageHeader, PriorityBadge, StatusBadge } from "@/components/shared/ui-bits";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { useRouteQuery } from "@/hooks/use-route-query";
import { formatDateKey, relativeDayLabel } from "@/lib/dates";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, courseCode } from "@/lib/labels";
import { isDueOn, isOverdue, rankTasks } from "@/lib/priority-engine";
import { formatDuration } from "@/lib/utils";
import type { Priority, Task, TaskStatus } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type View = "all" | "overdue" | "today" | "upcoming" | "completed";
type SortKey = "smart" | "deadline" | "priority" | "duration" | "title";

const priorityRank: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function TasksScreen() {
  const { data, setTaskStatus, deleteTask } = useCampus();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [sort, setSort] = useState<SortKey>("smart");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [courseId, setCourseId] = useState("all");
  const [layout, setLayout] = useState<"list" | "board">("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const now = useMemo(() => new Date(), []);

  useRouteQuery("/tasks", setQuery, () => {
    setEditing(null);
    setOpen(true);
  });

  if (!data) return null;
  const today = formatDateKey(now, data.profile.timezone);
  const filtered = filterTasks(data.tasks, data.courses, { query, view, priority, courseId, today, now, timeZone: data.profile.timezone, sort });

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader
        eyebrow="Tasks"
        title="What needs doing"
        description="Search, filter, and move work between Not Started, In Progress, and Completed."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> New task
          </Button>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, description, or course" className="lg:max-w-xs" aria-label="Search tasks" />
        <Select value={priority} onChange={(event) => setPriority(event.target.value as "all" | Priority)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label="Filter by course">
          <option value="all">All courses</option>
          {data.courses.map((course) => (
            <option key={course.id} value={course.id}>{course.code}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort tasks">
          <option value="smart">Sort: smart rank</option>
          <option value="deadline">Sort: deadline</option>
          <option value="priority">Sort: priority</option>
          <option value="duration">Sort: duration</option>
          <option value="title">Sort: title</option>
        </Select>
        <div className="flex rounded-lg border border-border p-0.5">
          <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${layout === "list" ? "bg-secondary" : ""}`} onClick={() => setLayout("list")}>List</button>
          <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${layout === "board" ? "bg-secondary" : ""}`} onClick={() => setLayout("board")}>Board</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "overdue", "today", "upcoming", "completed"] as View[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={`rounded-full px-3 py-1 text-xs ${view === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {item === "all" ? "All" : item === "today" ? "Due today" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No tasks match" body="Change the filters or create a task for the next deadline." action={<Button onClick={() => { setEditing(null); setOpen(true); }}>Create task</Button>} />
      ) : layout === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Deadline</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={task.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[task.category]}</p>
                  </td>
                  <td className="px-3 py-3">{courseCode(data.courses, task.courseId)}</td>
                  <td className="px-3 py-3">{relativeDayLabel(task.deadlineDate, today)} {task.deadlineTime}</td>
                  <td className="px-3 py-3"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-3 py-3">{formatDuration(task.estimatedMinutes)}</td>
                  <td className="px-3 py-3">
                    <Select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => {
                      void setTaskStatus(task.id, event.target.value as TaskStatus).then(() => toast.success("Status updated")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update status"));
                    }}>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" aria-label={`Edit ${task.title}`} onClick={() => { setEditing(task); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${task.title}`} onClick={() => setPendingDelete(task)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(["not_started", "in_progress", "completed"] as TaskStatus[]).map((status) => {
            const column = filtered.filter((task) => task.status === status);
            return (
              <section
                key={status}
                className="w-72 shrink-0 rounded-xl border border-border bg-card"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const id = event.dataTransfer.getData("text/plain");
                  if (!id) return;
                  setTaskStatus(id, status)
                    .then(() => toast.success(`Moved to ${STATUS_LABEL[status]}`))
                    .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update status"));
                }}
              >
                <header className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h2 className="text-sm font-medium">{STATUS_LABEL[status]}</h2>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </header>
                <div className="space-y-2 p-2">
                  {column.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nothing here.</p> : null}
                  {column.map((task) => (
                    <article key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)} className="cf-interactive cursor-grab rounded-lg border border-border bg-background p-3 active:cursor-grabbing">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{courseCode(data.courses, task.courseId)} · {relativeDayLabel(task.deadlineDate, today)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(task); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(task)}>Delete</Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TaskFormDialog open={open} onOpenChange={setOpen} task={editing} today={today} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => { if (!next) setPendingDelete(null); }}
        title="Delete task"
        body={pendingDelete ? `Delete “${pendingDelete.title}” from this device?` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteTask(pendingDelete.id).then(() => toast.success("Task deleted")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not delete the task"));
          toast.success("Task deleted");
        }}
      />
    </div>
  );
}

function filterTasks(
  tasks: Task[],
  courses: { id: string; code: string; name: string }[],
  options: {
    query: string;
    view: View;
    priority: "all" | Priority;
    courseId: string;
    today: string;
    now: Date;
    timeZone: string;
    sort: SortKey;
  },
) {
  const q = options.query.trim().toLowerCase();
  let list = tasks.filter((task) => {
    if (options.view === "overdue" && !isOverdue(task, options.now, options.timeZone)) return false;
    if (options.view === "today" && !isDueOn(task, options.today)) return false;
    if (options.view === "upcoming" && (task.status === "completed" || task.deadlineDate <= options.today)) return false;
    if (options.view === "completed" && task.status !== "completed") return false;
    if (options.priority !== "all" && task.priority !== options.priority) return false;
    if (options.courseId !== "all" && task.courseId !== options.courseId) return false;
    if (!q) return true;
    const course = courses.find((item) => item.id === task.courseId);
    const haystack = `${task.title} ${task.description} ${course?.code ?? ""} ${course?.name ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
  if (options.sort === "smart") {
    const order = new Map(rankTasks(list, options.now, options.timeZone).map((item, index) => [item.task.id, index]));
    list = [...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } else if (options.sort === "deadline") {
    list = [...list].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate) || a.deadlineTime.localeCompare(b.deadlineTime));
  } else if (options.sort === "priority") {
    list = [...list].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  } else if (options.sort === "duration") {
    list = [...list].sort((a, b) => b.estimatedMinutes - a.estimatedMinutes);
  } else {
    list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  }
  return list;
}
