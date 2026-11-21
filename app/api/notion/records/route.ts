import { mutateNotion, type NotionAction, type NotionEntity } from "@/lib/notion/mutate";
import { NotionRequestError } from "@/lib/notion/errors";
import { courseSchema, eventSchema, goalSchema, taskSchema } from "@/lib/validation";
import { z } from "zod";

const idField = z.string().trim().min(1).max(80);
const courseRef = z.object({ id: z.string().max(80), code: z.string().max(40) }).passthrough();

const bodySchema = z.object({
  entity: z.enum(["task", "course", "event", "goal"]),
  action: z.enum(["create", "update", "delete"]),
  dataSourceId: z.string().regex(/^[0-9a-fA-F-]{32,36}$/).optional().or(z.literal("")),
  record: z.unknown(),
  courses: z.array(courseRef).max(200).optional(),
});

export async function POST(request: Request) {
  if (!process.env.NOTION_API_KEY?.trim()) {
    return Response.json({ ok: false, error: "NOTION_API_KEY is not set. Stay in the local workspace or add the server token." }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "The Notion record request is invalid." }, { status: 400 });
  let record: unknown;
  try {
    record = validatedRecord(parsed.data.entity, parsed.data.action, parsed.data.record);
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "The record is invalid." }, { status: 400 });
  }
  try {
    const saved = await mutateNotion({
      entity: parsed.data.entity as NotionEntity,
      action: parsed.data.action as NotionAction,
      dataSourceId: parsed.data.dataSourceId || "",
      record,
      courses: (parsed.data.courses ?? []) as never,
    });
    return Response.json({ ok: true, record: saved });
  } catch (error) {
    const message = error instanceof NotionRequestError ? error.message : error instanceof Error ? error.message : "Notion write failed.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}

function validatedRecord(entity: "task" | "course" | "event" | "goal", action: "create" | "update" | "delete", record: unknown) {
  const id = record && typeof record === "object" && "id" in record ? idField.safeParse(record.id) : null;
  if (action === "delete") {
    if (!id?.success) throw new Error("A record id is required to delete.");
    return { id: id.data };
  }
  const schema = entity === "task" ? taskSchema : entity === "course" ? courseSchema : entity === "event" ? eventSchema : goalSchema;
  const parsed = schema.safeParse(record);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "The record is invalid.");
  if (action === "update" && !id?.success) throw new Error("A record id is required to update.");
  return { ...parsed.data, ...(id?.success ? { id: id.data } : {}) };
}
