"use client";

import { FormField } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { fieldErrors, taskSchema, type TaskInput } from "@/lib/validation";
import type { Task } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

type TaskFormState = {
  title: string;
  description: string;
  courseId: string;
  deadlineDate: string;
  deadlineTime: string;
  priority: TaskInput["priority"];
  status: TaskInput["status"];
  estimatedMinutes: string;
  category: TaskInput["category"];
};

const categories = Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>;
const priorities = Object.keys(PRIORITY_LABEL) as Array<keyof typeof PRIORITY_LABEL>;
const statuses = Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>;

function blank(today: string): TaskFormState {
  return {
    title: "",
    description: "",
    courseId: "",
    deadlineDate: today,
    deadlineTime: "23:59",
    priority: "medium" as const,
    status: "not_started" as const,
    estimatedMinutes: "60",
    category: "assignment" as const,
  };
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  today: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <TaskForm key={task?.id ?? "new"} task={task} today={today} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function TaskForm({
  task,
  today,
  onOpenChange,
}: {
  task: Task | null;
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, addTask, updateTask } = useCampus();
  const [form, setForm] = useState<TaskFormState>(
    task
      ? {
          title: task.title,
          description: task.description,
          courseId: task.courseId ?? "",
          deadlineDate: task.deadlineDate,
          deadlineTime: task.deadlineTime,
          priority: task.priority,
          status: task.status,
          estimatedMinutes: String(task.estimatedMinutes),
          category: task.category,
        }
      : blank(today),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = taskSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      if (task) await updateTask(task.id, parsed.data);
      else await addTask(parsed.data);
      toast.success(task ? "Task updated" : "Task created");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the task");
    }
  }

  return (
    <DialogContent title={task ? "Edit task" : "New task"} description="Deadlines use your profile timezone.">
        <form className="grid gap-3" onSubmit={submit}>
          <FormField label="Title" htmlFor="task-title" error={errors.title}>
            <Input id="task-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </FormField>
          <FormField label="Description" htmlFor="task-description" error={errors.description}>
            <Textarea id="task-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Course" htmlFor="task-course" error={errors.courseId}>
              <Select id="task-course" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
                <option value="">General</option>
                {data?.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="task-category" error={errors.category}>
              <Select id="task-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as TaskInput["category"] })}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Deadline" htmlFor="task-date" error={errors.deadlineDate}>
              <Input id="task-date" type="date" value={form.deadlineDate} onChange={(event) => setForm({ ...form, deadlineDate: event.target.value })} />
            </FormField>
            <FormField label="Time" htmlFor="task-time" error={errors.deadlineTime}>
              <Input id="task-time" type="time" value={form.deadlineTime} onChange={(event) => setForm({ ...form, deadlineTime: event.target.value })} />
            </FormField>
            <FormField label="Priority" htmlFor="task-priority" error={errors.priority}>
              <Select id="task-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskInput["priority"] })}>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABEL[priority]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="task-status" error={errors.status}>
              <Select id="task-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskInput["status"] })}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Estimated minutes" htmlFor="task-minutes" error={errors.estimatedMinutes}>
            <Input id="task-minutes" type="number" min={10} max={720} value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{task ? "Save changes" : "Create task"}</Button>
          </div>
        </form>
      </DialogContent>
  );
}
