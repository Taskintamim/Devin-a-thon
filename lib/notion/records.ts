import type { Client } from "@notionhq/client";
import { withNotionRetry } from "@/lib/notion/errors";
import type { NotionPageLike } from "@/lib/notion/properties";

export async function queryAllPages(notion: Client, dataSourceId: string): Promise<NotionPageLike[]> {
  const pages: NotionPageLike[] = [];
  let cursor: string | undefined;
  do {
    const response = await withNotionRetry(() =>
      notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        start_cursor: cursor,
        result_type: "page",
      }),
    );
    for (const result of response.results) {
      if (result.object === "page") pages.push(result as unknown as NotionPageLike);
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);
  return pages;
}

export async function createRecord(notion: Client, dataSourceId: string, properties: Record<string, unknown>) {
  const page = await withNotionRetry(() =>
    notion.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: properties as never,
    }),
  );
  return page as unknown as NotionPageLike;
}

export async function updateRecord(notion: Client, pageId: string, properties: Record<string, unknown>) {
  const page = await withNotionRetry(() =>
    notion.pages.update({
      page_id: pageId,
      properties: properties as never,
    }),
  );
  return page as unknown as NotionPageLike;
}

export async function archiveRecord(notion: Client, pageId: string) {
  await withNotionRetry(() => notion.pages.update({ page_id: pageId, in_trash: true }));
}
