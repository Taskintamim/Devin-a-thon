import { APIResponseError, isNotionClientError } from "@notionhq/client";

export class NotionRequestError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "NotionRequestError";
    this.status = status;
  }
}

export function safeNotionMessage(error: unknown): string {
  if (error instanceof NotionRequestError) return error.message;
  if (error instanceof APIResponseError) {
    if (error.status === 401) return "Notion rejected the integration token.";
    if (error.status === 403) return "The integration cannot access that Notion page. Share the parent page with the integration.";
    if (error.status === 404) return "Notion could not find that page or data source. Check the ID and sharing.";
    if (error.status === 429) return "Notion rate limit reached. Wait a moment and try again.";
    if (error.code === "validation_error") return "Notion rejected the property values. Check that the database columns match CampusFlow.";
    return "Notion request failed.";
  }
  if (isNotionClientError(error)) return "Could not reach Notion. Check the network and try again.";
  if (error instanceof Error && /fetch|network|ENOTFOUND|ECONN/i.test(error.message)) {
    return "Could not reach Notion. Check the network and try again.";
  }
  return "Notion request failed.";
}

export async function withNotionRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof APIResponseError && error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        return await operation();
      } catch (retryError) {
        throw new NotionRequestError(safeNotionMessage(retryError), retryError instanceof APIResponseError ? retryError.status : null);
      }
    }
    throw new NotionRequestError(safeNotionMessage(error), error instanceof APIResponseError ? error.status : null);
  }
}
