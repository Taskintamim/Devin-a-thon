import { answerWithRules } from "@/lib/assistant/engine";
import type { AssistantSnapshot } from "@/types";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  snapshot: z.custom<AssistantSnapshot>((value) => {
    if (!value || typeof value !== "object") return false;
    const snapshot = value as AssistantSnapshot;
    return Array.isArray(snapshot.tasks) && snapshot.tasks.length <= 500 && Array.isArray(snapshot.courses) && snapshot.courses.length <= 200 && Boolean(snapshot.profile) && Boolean(snapshot.planner);
  }, "Snapshot is incomplete"),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const reply = answerWithRules(parsed.data.message, parsed.data.snapshot, new Date());
  return Response.json({ reply });
}
