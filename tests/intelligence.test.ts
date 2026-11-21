import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBaselineDayPlan, buildBaselineWeekPlan } from "@/lib/planner/schedule";
import { recommendTasks, scoreTask } from "@/lib/priority-engine";
import { pageToTask, taskToProperties } from "@/lib/notion/properties";
import { safeNotionMessage, NotionRequestError } from "@/lib/notion/errors";
import { requiredSources } from "@/lib/notion/sync";
import type { CampusEvent, Course, Task } from "@/types";

const now = new Date("2026-11-21T08:00:00.000Z");
const timeZone = "Asia/Dhaka";

function task(partial: Partial<Task> & Pick<Task, "title">): Task {
  return {
    id: partial.id ?? partial.title,
    description: "",
    courseId: null,
    deadlineDate: "2026-11-28",
    deadlineTime: "23:59",
    priority: "medium",
    status: "not_started",
    estimatedMinutes: 60,
    category: "assignment",
    createdAt: now.toISOString(),
    completedAt: null,
    ...partial,
  };
}

const config = {
  studyStartTime: "19:00",
  studyDurationHours: 1,
  breakMinutes: 10,
  focusBlockMinutes: 25,
  studyDays: [0, 1, 2, 3, 4, 5, 6],
};

describe("priority scores", () => {
  it("keeps scores inside 0 to 100 and stays deterministic", () => {
    const sample = task({ title: "Lab", deadlineDate: "2026-11-22", priority: "critical", estimatedMinutes: 180 });
    const first = scoreTask(sample, now, timeZone);
    const second = scoreTask(sample, now, timeZone);
    assert.deepEqual(first, second);
    assert.ok(first.score >= 0 && first.score <= 100);
    assert.match(first.explanation, /Lab/);
    assert.match(first.explanation, /tomorrow/);
  });

  it("ranks overdue above today, today above next week, and drops completed work", () => {
    const overdue = task({ title: "Overdue", deadlineDate: "2026-11-19", priority: "medium" });
    const today = task({ title: "Today", deadlineDate: "2026-11-21", priority: "medium" });
    const nextWeek = task({ title: "Next week", deadlineDate: "2026-11-28", priority: "medium" });
    const done = task({ title: "Done", deadlineDate: "2026-11-19", priority: "critical", status: "completed" });
    const missing = task({ title: "No date", deadlineDate: "", priority: "high" });
    const invalid = task({ title: "Bad date", deadlineDate: "2026-02-31", priority: "critical" });
    const unknownDuration = task({ title: "No time", deadlineDate: "2026-11-21", estimatedMinutes: Number.NaN });
    const ranked = recommendTasks([done, nextWeek, today, overdue, missing, invalid, unknownDuration], now, timeZone);
    assert.equal(ranked.some((item) => item.task.title === "Done"), false);
    assert.ok(ranked.findIndex((item) => item.task.title === "Overdue") < ranked.findIndex((item) => item.task.title === "Today"));
    assert.ok(ranked.findIndex((item) => item.task.title === "Today") < ranked.findIndex((item) => item.task.title === "Next week"));
    assert.equal(scoreTask(missing, now, timeZone).score > 0, true);
    assert.equal(scoreTask(invalid, now, timeZone).explanation.includes("no valid deadline"), true);
    assert.equal(scoreTask(unknownDuration, now, timeZone).explanation.includes("duration not set"), true);
    const critical = scoreTask(task({ title: "Critical", priority: "critical", deadlineDate: "2026-11-21" }), now, timeZone);
    const low = scoreTask(task({ title: "Low", priority: "low", deadlineDate: "2026-11-21" }), now, timeZone);
    assert.ok(critical.score > low.score);
  });
});

describe("daily planner", () => {
  const commitment: CampusEvent = {
    id: "club",
    title: "Club meeting",
    category: "club",
    date: "2026-11-21",
    startTime: "19:00",
    endTime: "19:30",
    location: "Hall",
    description: "",
    status: "attending",
    organization: "IEEE",
  };

  it("leaves a commitment in place and does not schedule a completed task", () => {
    const open = task({ title: "Open", deadlineDate: "2026-11-21", estimatedMinutes: 40 });
    const done = task({ title: "Done", deadlineDate: "2026-11-21", status: "completed", estimatedMinutes: 40 });
    const blocks = buildBaselineDayPlan({
      date: "2026-11-21",
      config,
      tasks: [open, done],
      events: [commitment],
      now,
      timeZone,
    });
    assert.equal(blocks.some((block) => block.taskId === "Done"), false);
    const meeting = blocks.find((block) => block.kind === "commitment");
    assert.ok(meeting);
    const study = blocks.find((block) => block.taskId === "Open");
    assert.ok(study);
    assert.ok(study.startMinutes >= meeting.endMinutes);
  });

  it("does not place a task after its deadline or after the deadline time", () => {
    const late = task({ title: "After hours", deadlineDate: "2026-11-21", deadlineTime: "18:00", estimatedMinutes: 40 });
    const missed = buildBaselineWeekPlan({
      weekStart: "2026-11-22",
      config: { ...config, studyDays: [0, 1, 2, 3, 4, 5, 6] },
      tasks: [task({ title: "Friday work", deadlineDate: "2026-11-21", priority: "high", estimatedMinutes: 40 })],
      now,
      timeZone,
    });
    assert.equal(missed.some((block) => block.taskId === "Friday work"), false);
    const sameDay = buildBaselineDayPlan({
      date: "2026-11-21",
      config,
      tasks: [late],
      now,
      timeZone,
    });
    assert.equal(sameDay.some((block) => block.taskId === "After hours"), false);
  });

  it("does not duplicate a task inside one day", () => {
    const only = task({ title: "Only", deadlineDate: "2026-11-21", estimatedMinutes: 20 });
    const blocks = buildBaselineDayPlan({ date: "2026-11-21", config, tasks: [only, only], events: [], now, timeZone });
    assert.equal(blocks.filter((block) => block.taskId === "Only").length, 1);
  });
});

describe("notion mapping", () => {
  const course: Course = {
    id: "course-1",
    name: "Databases",
    code: "CSE 310",
    instructor: "Dr. Rahman",
    creditHours: 3,
    semester: "Fall 2026",
    color: "#000",
  };

  it("round-trips a task page and ignores trash", () => {
    const source = task({ title: "Schema", courseId: "course-1", priority: "high", deadlineDate: "2026-11-25" });
    const properties = taskToProperties(source, "CSE 310");
    const page = {
      id: "page-1",
      properties: {
        Title: { title: [{ plain_text: "Schema" }] },
        Description: { rich_text: [] },
        Course: { rich_text: [{ plain_text: "CSE 310" }] },
        Deadline: { date: { start: "2026-11-25" } },
        Priority: { select: { name: "High" } },
        Status: { select: { name: "Not Started" } },
        "Estimated Duration": { number: 60 },
        Category: { select: { name: "Assignment" } },
      },
    };
    const mapped = pageToTask(page, [course]);
    assert.equal(mapped?.title, "Schema");
    assert.equal(mapped?.courseId, "course-1");
    assert.equal(mapped?.priority, "high");
    assert.equal(pageToTask({ ...page, in_trash: true }, [course]), null);
    assert.equal((properties.Title as { title: { text: { content: string } }[] }).title[0].text.content, "Schema");
  });

  it("reports missing sources and hides raw API text that is not useful", () => {
    assert.deepEqual(requiredSources({ tasksDataSourceId: "abc" }), ["courses", "events", "career"]);
    assert.equal(safeNotionMessage(new NotionRequestError("Notion rejected the integration token.", 401)), "Notion rejected the integration token.");
    assert.equal(safeNotionMessage(new Error("secret_should_not_leak")), "Notion request failed.");
  });
});
