import type { Client } from "@notionhq/client";
import { archiveRecord, createRecord, queryAllPages, updateRecord } from "@/lib/notion/records";
import { pageToTask, taskToProperties, type NotionPageLike } from "@/lib/notion/properties";
import type { Course, Task } from "@/types";

export async function listTasks(notion: Client, dataSourceId: string, courses: Course[]): Promise<Task[]> {
  const pages = await queryAllPages(notion, dataSourceId);
  return pages.map((page) => pageToTask(page, courses)).filter((task): task is Task => task !== null);
}

export async function createTask(notion: Client, dataSourceId: string, task: Task, courses: Course[]): Promise<Task> {
  const page = await createRecord(notion, dataSourceId, taskToProperties(task, courseCode(courses, task.courseId)));
  return pageToTask(page, courses) ?? taskWithId(task, page);
}

export async function updateTask(notion: Client, task: Task, courses: Course[]): Promise<Task> {
  const page = await updateRecord(notion, task.id, taskToProperties(task, courseCode(courses, task.courseId)));
  return pageToTask(page, courses) ?? task;
}

export async function deleteTask(notion: Client, pageId: string) {
  await archiveRecord(notion, pageId);
}

function courseCode(courses: Course[], courseId: string | null): string {
  return courses.find((course) => course.id === courseId)?.code ?? "";
}

function taskWithId(task: Task, page: NotionPageLike): Task {
  return { ...task, id: page.id };
}
