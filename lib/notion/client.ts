import { Client } from "@notionhq/client";

export const NOTION_VERSION = "2025-09-03";

export function requireNotionKey(): string {
  const key = process.env.NOTION_API_KEY?.trim();
  if (!key) {
    throw new Error("NOTION_API_KEY is not set on the server.");
  }
  return key;
}

export function notionClient(): Client {
  return new Client({ auth: requireNotionKey(), notionVersion: NOTION_VERSION });
}

export function envSourceIds() {
  return {
    parentPageId: process.env.NOTION_PARENT_PAGE_ID?.trim() ?? "",
    tasksDataSourceId: process.env.NOTION_TASKS_DATA_SOURCE_ID?.trim() ?? "",
    coursesDataSourceId: process.env.NOTION_COURSES_DATA_SOURCE_ID?.trim() ?? "",
    eventsDataSourceId: process.env.NOTION_EVENTS_DATA_SOURCE_ID?.trim() ?? "",
    careerDataSourceId: process.env.NOTION_CAREER_DATA_SOURCE_ID?.trim() ?? "",
  };
}
