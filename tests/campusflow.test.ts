import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerWithRules } from "@/lib/assistant/engine";
import { buildDemoContent, defaultProfile } from "@/lib/demo/seed";
import { formatDateKey } from "@/lib/dates";
import { buildBaselineWeekPlan } from "@/lib/planner/schedule";
import { isOverdue, rankTasks } from "@/lib/priority-engine";
import { buildDailyBrief } from "@/lib/priority-engine/brief";
import { taskSchema } from "@/lib/validation";
import type { Task } from "@/types";

const now = new Date("2026-11-21T08:00:00.000Z");
const timeZone = "Asia/Dhaka";

function task(partial: Partial<Task> & Pick<Task, "title" | "deadlineDate" | "priority">): Task {
  return {
    id: partial.id ?? partial.title,
    description: "",
    courseId: null,
    deadlineTime: "23:59",
    status: "not_started",
    estimatedMinutes: 60,
    category: "assignment",
    createdAt: now.toISOString(),
    completedAt: null,
    ...partial,
  };
}

describe("demo seed", () => {
  const content = buildDemoContent({ now, timeZone, semester: "Fall 2026" });

  it("includes the required demo records", () => {
    assert.ok(content.courses.length >= 5);
    assert.ok(content.tasks.length >= 12);
    assert.ok(content.events.length >= 4);
    assert.ok(content.goals.length >= 4);
    assert.ok(content.blocks.length > 0);
  });

  it("places the overdue critical task on today", () => {
    const today = formatDateKey(now, timeZone);
    const overdue = content.tasks.find((item) => item.title.startsWith("ER diagram"));
    assert.ok(overdue);
    assert.equal(isOverdue(overdue, now, timeZone), true);
    assert.ok(content.blocks.some((block) => block.taskId === overdue.id && block.date === today));
  });

  it("keeps today's blocks inside the study window without overlap", () => {
    const today = formatDateKey(now, timeZone);
    const blocks = content.blocks.filter((block) => block.date === today).sort((a, b) => a.startMinutes - b.startMinutes);
    const start = 19 * 60;
    const end = start + 3 * 60;
    for (const block of blocks) {
      assert.ok(block.startMinutes >= start);
      assert.ok(block.endMinutes <= end);
      assert.ok(block.endMinutes > block.startMinutes);
    }
    for (let index = 1; index < blocks.length; index += 1) {
      assert.ok(blocks[index].startMinutes >= blocks[index - 1].endMinutes);
    }
  });
});

describe("priority engine", () => {
  it("ranks an overdue critical task ahead of a later low-priority task", () => {
    const overdue = task({ title: "Overdue lab", deadlineDate: "2026-11-18", priority: "critical" });
    const later = task({ title: "Optional reading", deadlineDate: "2026-12-01", priority: "low", category: "reading" });
    const ranked = rankTasks([later, overdue], now, timeZone);
    assert.equal(ranked[0].task.title, "Overdue lab");
    assert.ok(ranked[0].reasons.some((reason) => reason.includes("Overdue")));
  });

  it("builds a brief from the real top task", () => {
    const profile = { ...defaultProfile(), name: "Ayaan", onboardingComplete: true };
    const top = task({ title: "Overdue lab", deadlineDate: "2026-11-19", priority: "critical" });
    const brief = buildDailyBrief({ tasks: [top], courses: [], profile, now });
    assert.match(brief.summary, /Overdue lab/);
    assert.match(brief.headline, /attention today/);
  });
});

describe("assistant", () => {
  it("answers overdue questions from snapshot data and labels the engine", () => {
    const content = buildDemoContent({ now, timeZone, semester: "Fall 2026" });
    const reply = answerWithRules("Which assignments are overdue?", { ...content, profile: defaultProfile(), responsibilities: content.responsibilities }, now);
    assert.equal(reply.engine, "rules");
    assert.match(reply.content, /ER diagram/);
  });
});

describe("validation", () => {
  it("rejects a blank task title", () => {
    const parsed = taskSchema.safeParse({
      title: "   ",
      description: "",
      courseId: "",
      deadlineDate: "2026-11-21",
      deadlineTime: "23:59",
      priority: "medium",
      status: "not_started",
      estimatedMinutes: 30,
      category: "assignment",
    });
    assert.equal(parsed.success, false);
  });
});

describe("week plan", () => {
  it("does not repeat a short task across two weeks", () => {
    const short = task({ id: "short", title: "Short note", deadlineDate: "2026-11-21", priority: "high", estimatedMinutes: 30 });
    const config = {
      studyStartTime: "19:00",
      studyDurationHours: 3,
      breakMinutes: 10,
      focusBlockMinutes: 50,
      studyDays: [0, 1, 2, 3, 4, 5, 6],
    };
    const first = buildBaselineWeekPlan({
      weekStart: "2026-11-15",
      config,
      tasks: [short],
      now,
      timeZone,
    });
    const second = buildBaselineWeekPlan({
      weekStart: "2026-11-22",
      config,
      tasks: [short],
      reservedMinutes: new Map([["short", 30]]),
      now,
      timeZone,
    });
    assert.ok(first.some((block) => block.taskId === "short"));
    assert.equal(second.some((block) => block.taskId === "short"), false);
  });
});
