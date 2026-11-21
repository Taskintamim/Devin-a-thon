import { notionClient } from "@/lib/notion/client";
import { createCourse, deleteCourse, updateCourse } from "@/lib/notion/courses";
import { createEvent, deleteEvent, updateEvent } from "@/lib/notion/events";
import { createGoal, deleteGoal, updateGoal } from "@/lib/notion/career";
import { createTask, deleteTask, updateTask } from "@/lib/notion/tasks";
import type { CampusEvent, CareerGoal, Course, Task } from "@/types";

export type NotionEntity = "task" | "course" | "event" | "goal";
export type NotionAction = "create" | "update" | "delete";

export async function mutateNotion(options: {
  entity: NotionEntity;
  action: NotionAction;
  dataSourceId: string;
  record: unknown;
  courses: Course[];
}) {
  const notion = notionClient();
  if (options.action === "delete") {
    const id = typeof options.record === "object" && options.record && "id" in options.record ? String(options.record.id) : "";
    if (!id) throw new Error("A record id is required to delete.");
    if (options.entity === "task") await deleteTask(notion, id);
    if (options.entity === "course") await deleteCourse(notion, id);
    if (options.entity === "event") await deleteEvent(notion, id);
    if (options.entity === "goal") await deleteGoal(notion, id);
    return { deleted: true, id };
  }
  if (!options.dataSourceId && options.action === "create") {
    throw new Error("That Notion data source is not configured.");
  }
  if (options.entity === "task") {
    const task = options.record as Task;
    const saved = options.action === "create" ? await createTask(notion, options.dataSourceId, task, options.courses) : await updateTask(notion, task, options.courses);
    return saved;
  }
  if (options.entity === "course") {
    const course = options.record as Course;
    const saved = options.action === "create" ? await createCourse(notion, options.dataSourceId, course, options.courses.length) : await updateCourse(notion, course);
    return saved;
  }
  if (options.entity === "event") {
    const event = options.record as CampusEvent;
    const saved = options.action === "create" ? await createEvent(notion, options.dataSourceId, event) : await updateEvent(notion, event);
    return saved;
  }
  const goal = options.record as CareerGoal;
  const saved = options.action === "create" ? await createGoal(notion, options.dataSourceId, goal) : await updateGoal(notion, goal);
  return saved;
}
