import { envSourceIds, notionClient } from "@/lib/notion/client";
import { setupWorkspace, sourcesFromSetup } from "@/lib/notion/databases";
import { NotionRequestError } from "@/lib/notion/errors";
import { z } from "zod";

const bodySchema = z.object({
  parentPageId: z.string().regex(/^[0-9a-fA-F-]{32,36}$/).optional(),
});

export async function POST(request: Request) {
  if (!process.env.NOTION_API_KEY?.trim()) {
    return Response.json({ ok: false, error: "NOTION_API_KEY is not set on the server." }, { status: 400 });
  }
  let json: unknown = {};
  try {
    if (request.headers.get("content-length") !== "0") json = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: "Parent page ID is invalid." }, { status: 400 });
  const parentPageId = parsed.data.parentPageId || envSourceIds().parentPageId;
  if (!parentPageId) {
    return Response.json({ ok: false, error: "Set NOTION_PARENT_PAGE_ID or paste the parent page ID. Share that page with the integration first." }, { status: 400 });
  }
  try {
    const created = await setupWorkspace(notionClient(), parentPageId);
    return Response.json({
      ok: true,
      parentPageId,
      sources: { parentPageId, ...sourcesFromSetup(created) },
      databases: created,
      message: created.every((item) => !item.created)
        ? "Existing CampusFlow databases were found. No duplicates were created."
        : "CampusFlow databases are ready. Review the list before syncing.",
    });
  } catch (error) {
    const message = error instanceof NotionRequestError ? error.message : error instanceof Error ? error.message : "Workspace setup failed.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
