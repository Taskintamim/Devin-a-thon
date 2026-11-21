"use client";

import { CourseFormDialog } from "@/components/courses/course-form-dialog";
import { Badge, EmptyState, PageHeader, StatusBadge } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent } from "@/components/ui/dialog";
import { useCampus } from "@/hooks/use-campus";
import { useRouteQuery } from "@/hooks/use-route-query";
import { relativeDayLabel, formatDateKey } from "@/lib/dates";
import type { Course } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function CoursesScreen() {
  const { data, deleteCourse } = useCampus();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [detail, setDetail] = useState<Course | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);
  const now = useMemo(() => new Date(), []);
  useRouteQuery("/courses", setQuery, () => {
    setEditing(null);
    setOpen(true);
  });
  if (!data) return null;
  const today = formatDateKey(now, data.profile.timezone);
  const q = query.trim().toLowerCase();
  const courses = data.courses.filter((course) => !q || `${course.code} ${course.name} ${course.instructor}`.toLowerCase().includes(q));

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader
        eyebrow="Courses"
        title={data.profile.semester || "Courses"}
        description="Track instructors, credit hours, and how much of each course's work is done."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" /> Add course</Button>}
      />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses" aria-label="Search courses" className="h-10 w-full max-w-sm rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {courses.length === 0 ? <EmptyState title="No courses" body="Add a course to attach assignments and exams to it." action={<Button onClick={() => setOpen(true)}>Add course</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const related = data.tasks.filter((task) => task.courseId === course.id);
            const done = related.filter((task) => task.status === "completed").length;
            const percent = related.length ? Math.round((done / related.length) * 100) : 0;
            return (
              <article key={course.id} className="cf-interactive cf-lift rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium" style={{ color: course.color }}>{course.code}</p>
                    <h2 className="mt-1 text-base font-semibold">{course.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                  </div>
                  <Badge>{course.creditHours} cr</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{course.semester} · {done}/{related.length} tasks complete</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, background: course.color }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDetail(course)}>Details</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(course); setOpen(true); }}><Pencil className="size-3.5" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(course)}><Trash2 className="size-3.5" /> Delete</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <CourseFormDialog open={open} onOpenChange={setOpen} course={editing} />
      <Dialog open={Boolean(detail)} onOpenChange={(next) => { if (!next) setDetail(null); }}>
        {detail ? (
          <DialogContent title={`${detail.code} · ${detail.name}`} description={`${detail.instructor} · ${detail.creditHours} credit hours · ${detail.semester}`}>
            <div className="space-y-2">
              {data.tasks.filter((task) => task.courseId === detail.id).length === 0 ? <p className="text-sm text-muted-foreground">No tasks linked to this course yet.</p> : null}
              {data.tasks.filter((task) => task.courseId === detail.id).map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{relativeDayLabel(task.deadlineDate, today)} {task.deadlineTime}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => { if (!next) setPendingDelete(null); }}
        title="Delete course"
        body={pendingDelete ? `Delete ${pendingDelete.code}? Linked tasks stay, but they become unassigned.` : ""}
        confirmLabel="Delete course"
        onConfirm={() => {
          if (!pendingDelete) return;
          const target = pendingDelete;
          setPendingDelete(null);
          void deleteCourse(target.id).then(() => toast.success("Course deleted. Linked tasks are now unassigned.")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not delete the course"));
        }}
      />
    </div>
  );
}
