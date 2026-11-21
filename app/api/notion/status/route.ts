import { envSourceIds } from "@/lib/notion/client";
import { NotionRequestError } from "@/lib/notion/errors";
import { probeNotion } from "@/lib/notion/status";
import { z } from "zod";

const idSchema = z.string().regex(/^[0-9a-fA-F-]{32,36}$/).optional().or(z.literal(""));

export async function GET(request: Request) {
  const parent = new URL(request.url).searchParams.get("parentPageId") ?? envSourceIds().parentPageId;
  const parsed = idSchema.safeParse(parent);
  if (parent && !parsed.success) {
    return Response.json({ connected: false, message: "The parent page ID is not a valid Notion ID." }, { status: 400 });
  }
  if (!process.env.NOTION_API_KEY?.trim()) {
    return Response.json({
      connected: false,
      configured: false,
      message: "Notion is not connected. CampusFlow is using the local workspace and keeping data in this browser.",
      sources: envSourceIds(),
    });
  }
  try {
    const probe = await probeNotion(parent || undefined);
    return Response.json({
      connected: probe.connected,
      configured: true,
      message: probe.message,
      workspaceName: probe.workspaceName,
      parentTitle: probe.parentTitle,
      sources: envSourceIds(),
    });
  } catch (error) {
    const message = error instanceof NotionRequestError ? error.message : "Could not reach Notion.";
    return Response.json({ connected: false, configured: true, message, sources: envSourceIds() }, { status: 502 });
  }
}
