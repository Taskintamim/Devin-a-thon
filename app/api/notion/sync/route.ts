import { envSourceIds, notionClient } from "@/lib/notion/client";
import { NotionRequestError } from "@/lib/notion/errors";
import { pullWorkspace } from "@/lib/notion/sync";
import type { NotionSourceIds } from "@/types";
import { z } from "zod";

const id = z.string().regex(/^[0-9a-fA-F-]{32,36}$/).optional().or(z.literal(""));

const bodySchema = z.object({
  parentPageId: id.optional(),
  tasksDataSourceId: id.optional(),
  coursesDataSourceId: id.optional(),
  eventsDataSourceId: id.optional(),
  careerDataSourceId: id.optional(),
});

export async function POST(request: Request) {
  if (!process.env.NOTION_API_KEY?.trim()) {
    return Response.json({ ok: false, error: "NOTION_API_KEY is not set on the server." }, { status: 400 });
  }
  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    json = {};
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "Data source IDs are invalid." }, { status: 400 });
  const env = envSourceIds();
  const sources: NotionSourceIds = {
    parentPageId: env.parentPageId || parsed.data.parentPageId || "",
    tasksDataSourceId: env.tasksDataSourceId || parsed.data.tasksDataSourceId || "",
    coursesDataSourceId: env.coursesDataSourceId || parsed.data.coursesDataSourceId || "",
    eventsDataSourceId: env.eventsDataSourceId || parsed.data.eventsDataSourceId || "",
    careerDataSourceId: env.careerDataSourceId || parsed.data.careerDataSourceId || "",
  };
  try {
    const data = await pullWorkspace(notionClient(), sources);
    return Response.json({
      ok: true,
      sources,
      data,
      syncedAt: new Date().toISOString(),
      message: `Pulled ${data.tasks.length} tasks, ${data.courses.length} courses, ${data.events.length} events, and ${data.goals.length} goals from Notion.`,
    });
  } catch (error) {
    const message = error instanceof NotionRequestError ? error.message : error instanceof Error ? error.message : "Sync failed.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
