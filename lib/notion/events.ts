import type { Client } from "@notionhq/client";
import { archiveRecord, createRecord, queryAllPages, updateRecord } from "@/lib/notion/records";
import { eventToProperties, pageToEvent } from "@/lib/notion/properties";
import type { CampusEvent } from "@/types";

export async function listEvents(notion: Client, dataSourceId: string): Promise<CampusEvent[]> {
  const pages = await queryAllPages(notion, dataSourceId);
  return pages.map((page) => pageToEvent(page)).filter((event): event is CampusEvent => event !== null);
}

export async function createEvent(notion: Client, dataSourceId: string, event: CampusEvent): Promise<CampusEvent> {
  const page = await createRecord(notion, dataSourceId, eventToProperties(event));
  return pageToEvent(page) ?? { ...event, id: page.id };
}

export async function updateEvent(notion: Client, event: CampusEvent): Promise<CampusEvent> {
  const page = await updateRecord(notion, event.id, eventToProperties(event));
  return pageToEvent(page) ?? event;
}

export async function deleteEvent(notion: Client, pageId: string) {
  await archiveRecord(notion, pageId);
}
