import type { Client } from "@notionhq/client";
import { listCourses } from "@/lib/notion/courses";
import { listEvents } from "@/lib/notion/events";
import { listGoals } from "@/lib/notion/career";
import { listTasks } from "@/lib/notion/tasks";
import type { NotionSourceIds } from "@/types";

export async function pullWorkspace(notion: Client, sources: NotionSourceIds) {
  const missing = requiredSources(sources);
  if (missing.length > 0) {
    throw new Error(`Missing Notion data source ids: ${missing.join(", ")}. Run workspace setup or set the environment variables.`);
  }
  const courses = await listCourses(notion, sources.coursesDataSourceId);
  const [tasks, events, goals] = await Promise.all([
    listTasks(notion, sources.tasksDataSourceId, courses),
    listEvents(notion, sources.eventsDataSourceId),
    listGoals(notion, sources.careerDataSourceId),
  ]);
  return { courses, tasks, events, goals };
}

export function requiredSources(sources: Partial<NotionSourceIds>): string[] {
  const missing: string[] = [];
  if (!sources.tasksDataSourceId) missing.push("tasks");
  if (!sources.coursesDataSourceId) missing.push("courses");
  if (!sources.eventsDataSourceId) missing.push("events");
  if (!sources.careerDataSourceId) missing.push("career");
  return missing;
}
