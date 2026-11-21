import { notionClient } from "@/lib/notion/client";
import { withNotionRetry } from "@/lib/notion/errors";

export interface NotionProbe {
  connected: boolean;
  workspaceName: string | null;
  parentTitle: string | null;
  message: string;
}

export async function probeNotion(parentPageId?: string): Promise<NotionProbe> {
  const notion = notionClient();
  const me = await withNotionRetry(() => notion.users.me({}));
  const workspaceName = "name" in me && me.name ? me.name : "bot" in me ? me.bot.workspace_name : null;
  if (!parentPageId) {
    return {
      connected: true,
      workspaceName,
      parentTitle: null,
      message: workspaceName
        ? `Token works for ${workspaceName}. Add a parent page ID to create the CampusFlow databases.`
        : "Token works. Add a parent page ID to create the CampusFlow databases.",
    };
  }
  const page = await withNotionRetry(() => notion.pages.retrieve({ page_id: parentPageId }));
  const title = pageTitle(page);
  return {
    connected: true,
    workspaceName,
    parentTitle: title,
    message: title
      ? `Connected to ${workspaceName ?? "Notion"}. Parent page “${title}” is reachable.`
      : `Connected to ${workspaceName ?? "Notion"}. The parent page is reachable.`,
  };
}

function pageTitle(page: unknown): string | null {
  if (!page || typeof page !== "object" || !("properties" in page)) return null;
  const properties = (page as { properties: Record<string, { title?: { plain_text?: string }[] }> }).properties;
  for (const property of Object.values(properties)) {
    const text = property.title?.map((item) => item.plain_text ?? "").join("").trim();
    if (text) return text;
  }
  return null;
}
