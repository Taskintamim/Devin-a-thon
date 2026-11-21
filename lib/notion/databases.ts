import type { Client } from "@notionhq/client";
import { withNotionRetry } from "@/lib/notion/errors";
import {
  CAREER_SOURCE,
  COURSE_SOURCE,
  EVENT_SOURCE,
  TASK_SOURCE,
  careerProperties,
  courseProperties,
  eventProperties,
  taskProperties,
} from "@/lib/notion/properties";

export interface SourceSetup {
  name: string;
  dataSourceId: string;
  databaseId: string;
  created: boolean;
}

const CATALOG = [
  { name: TASK_SOURCE, properties: taskProperties },
  { name: COURSE_SOURCE, properties: courseProperties },
  { name: EVENT_SOURCE, properties: eventProperties },
  { name: CAREER_SOURCE, properties: careerProperties },
] as const;

export async function setupWorkspace(notion: Client, parentPageId: string): Promise<SourceSetup[]> {
  const existing = await listChildDatabases(notion, parentPageId);
  const results: SourceSetup[] = [];
  for (const entry of CATALOG) {
    const found = existing.find((item) => item.title === entry.name);
    if (found) {
      results.push({ name: entry.name, dataSourceId: found.dataSourceId, databaseId: found.databaseId, created: false });
      continue;
    }
    const created = await withNotionRetry(() =>
      notion.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: entry.name } }],
        initial_data_source: { properties: entry.properties() as never },
      }),
    );
    const payload = created as unknown as { id: string; data_sources?: { id: string }[] };
    const dataSourceId = payload.data_sources?.[0]?.id;
    if (!dataSourceId) {
      throw new Error(`Notion created ${entry.name} but did not return a data source id.`);
    }
    results.push({ name: entry.name, dataSourceId, databaseId: payload.id, created: true });
  }
  return results;
}

async function listChildDatabases(notion: Client, parentPageId: string) {
  const found: { title: string; databaseId: string; dataSourceId: string }[] = [];
  let cursor: string | undefined;
  do {
    const response = await withNotionRetry(() =>
      notion.blocks.children.list({ block_id: parentPageId, page_size: 100, start_cursor: cursor }),
    );
    for (const block of response.results) {
      if (!("type" in block) || block.type !== "child_database") continue;
      const database = await withNotionRetry(() => notion.databases.retrieve({ database_id: block.id }));
      const payload = database as unknown as {
        id: string;
        title?: { plain_text?: string }[];
        data_sources?: { id: string }[];
      };
      const title = (payload.title ?? []).map((item) => item.plain_text ?? "").join("").trim();
      const dataSourceId = payload.data_sources?.[0]?.id;
      if (title && dataSourceId) found.push({ title, databaseId: payload.id, dataSourceId });
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);
  return found;
}

export function sourcesFromSetup(results: SourceSetup[]) {
  const byName = Object.fromEntries(results.map((item) => [item.name, item.dataSourceId]));
  return {
    tasksDataSourceId: byName[TASK_SOURCE] ?? "",
    coursesDataSourceId: byName[COURSE_SOURCE] ?? "",
    eventsDataSourceId: byName[EVENT_SOURCE] ?? "",
    careerDataSourceId: byName[CAREER_SOURCE] ?? "",
  };
}
