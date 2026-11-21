import { diffDays, formatDateKey, formatLongDate, formatMinutes, formatShortDate, relativeDayLabel } from "@/lib/dates";
import { courseCode, EVENT_STATUS_LABEL, GOAL_CATEGORY_LABEL } from "@/lib/labels";
import { buildBaselineDayPlan } from "@/lib/planner/schedule";
import { isOverdue, isValidDateKey, recommendTasks } from "@/lib/priority-engine";
import { plural } from "@/lib/utils";
import type { AssistantReply, AssistantSnapshot, Task } from "@/types";

/**
 * Rule-based assistant. A future LLM provider should implement the same
 * reply shape behind a server-side adapter and leave this engine as the fallback.
 */
export function answerWithRules(message: string, snapshot: AssistantSnapshot, now = new Date()): AssistantReply {
  const text = message.trim();
  const normalized = text.toLowerCase();
  const content = text ? route(normalized, snapshot, now) : "Ask a question about your tasks, deadlines, courses, events, or career goals.";
  return { content, engine: "rules" };
}

function route(normalized: string, snapshot: AssistantSnapshot, now: Date): string {
  if (/\b(help|what can you|how do you work)\b/.test(normalized)) return help(snapshot);
  if (/^(hi|hello|hey)\b/.test(normalized)) return greet(snapshot, now);
  if (/\b(overdue|late|behind)\b/.test(normalized)) return overdue(snapshot, now);
  if (/\b(exam|midterm|quiz)\b/.test(normalized)) return exams(snapshot, now);
  if (/\b(study plan|plan my|schedule|study hours)\b/.test(normalized)) return studyPlan(snapshot, now);
  if (/\b(priorit|work on|what should i|focus today|today)\b/.test(normalized)) return priorities(snapshot, now);
  if (/\b(this week|deadlines|coming up|upcoming)\b/.test(normalized)) return week(snapshot, now);
  if (/\b(course|class|instructor)\b/.test(normalized)) return courses(snapshot);
  if (/\b(career|internship|skill|portfolio|certification|resume)\b/.test(normalized)) return career(snapshot, now);
  if (/\b(event|campus|club|workshop|responsib)\b/.test(normalized)) return campus(snapshot, now);
  return help(snapshot);
}

function help(snapshot: AssistantSnapshot): string {
  const name = snapshot.profile.name.trim();
  return [
    `${name ? `${name}, this` : "This"} assistant reads your CampusFlow data with a fixed set of rules. No language model is connected.`,
    "",
    "You can ask:",
    "• What should I work on today?",
    "• Which assignments are overdue?",
    "• What deadlines do I have this week?",
    "• Help me prepare a study plan.",
    "• Which tasks should I prioritize?",
    "• What events are coming up?",
    "• How are my career goals tracking?",
  ].join("\n");
}

function greet(snapshot: AssistantSnapshot, now: Date): string {
  const name = snapshot.profile.name.trim() || "there";
  const timeZone = snapshot.profile.timezone;
  const overdueCount = snapshot.tasks.filter((task) => isOverdue(task, now, timeZone)).length;
  const todayKey = formatDateKey(now, timeZone);
  const dueToday = snapshot.tasks.filter((task) => task.status !== "completed" && task.deadlineDate === todayKey).length;
  return `Hello ${name}. You have ${plural(overdueCount, "overdue task")} and ${plural(dueToday, "task")} due today. Ask what to work on, or ask for a study plan. Answers come from the data in this workspace through the rules engine.`;
}

function taskLine(task: Task, snapshot: AssistantSnapshot, todayKey: string): string {
  return `• ${task.title} · ${courseCode(snapshot.courses, task.courseId)} · ${relativeDayLabel(task.deadlineDate, todayKey)} ${task.deadlineTime} · ${task.priority}`;
}

function overdue(snapshot: AssistantSnapshot, now: Date): string {
  const timeZone = snapshot.profile.timezone;
  const tasks = snapshot.tasks
    .filter((task) => isOverdue(task, now, timeZone))
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  if (tasks.length === 0) return "Nothing is overdue. The rules engine checked every open task against today's date.";
  const todayKey = formatDateKey(now, timeZone);
  return [`${plural(tasks.length, "task")} ${tasks.length === 1 ? "is" : "are"} overdue:`, "", ...tasks.map((task) => taskLine(task, snapshot, todayKey))].join("\n");
}

function priorities(snapshot: AssistantSnapshot, now: Date): string {
  const ranked = recommendTasks(snapshot.tasks, now, snapshot.profile.timezone).slice(0, 5);
  if (ranked.length === 0) return "You have no open tasks, so there is nothing to prioritize.";
  return [
    "Work in this order. Each score is 40% deadline urgency, 30% importance, 15% academic weight, and 15% how well the duration fits a study block.",
    "",
    ...ranked.map((item, index) => `${index + 1}. ${item.task.title} · ${courseCode(snapshot.courses, item.task.courseId)} · score ${item.score}\n   ${item.explanation}`),
  ].join("\n");
}

function week(snapshot: AssistantSnapshot, now: Date): string {
  const timeZone = snapshot.profile.timezone;
  const todayKey = formatDateKey(now, timeZone);
  const tasks = snapshot.tasks
    .filter((task) => task.status !== "completed" && isValidDateKey(task.deadlineDate) && task.deadlineDate >= todayKey && diffDays(todayKey, task.deadlineDate) <= 7)
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate) || a.deadlineTime.localeCompare(b.deadlineTime));
  const events = snapshot.events
    .filter((event) => event.status !== "cancelled" && isValidDateKey(event.date) && event.date >= todayKey && diffDays(todayKey, event.date) <= 7)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const lines = [`Deadlines in the next 7 days, from ${formatShortDate(todayKey)}.`];
  lines.push("");
  lines.push(tasks.length ? tasks.map((task) => taskLine(task, snapshot, todayKey)).join("\n") : "No task deadlines in the next 7 days.");
  lines.push("");
  lines.push(events.length ? "Events:" : "No campus events in the next 7 days.");
  if (events.length) {
    lines.push(
      ...events.map(
        (event) => `• ${event.title} · ${formatShortDate(event.date)} ${event.startTime} · ${event.location} · ${EVENT_STATUS_LABEL[event.status]}`,
      ),
    );
  }
  return lines.join("\n");
}

function exams(snapshot: AssistantSnapshot, now: Date): string {
  const todayKey = formatDateKey(now, snapshot.profile.timezone);
  const exams = snapshot.tasks
    .filter((task) => task.category === "exam" && task.status !== "completed")
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  if (exams.length === 0) return "You have no open exams or quizzes.";
  return ["Open exams and quizzes:", "", ...exams.map((task) => taskLine(task, snapshot, todayKey))].join("\n");
}

function studyPlan(snapshot: AssistantSnapshot, now: Date): string {
  const timeZone = snapshot.profile.timezone;
  const todayKey = formatDateKey(now, timeZone);
  const saved = snapshot.blocks
    .filter((block) => block.date === todayKey)
    .sort((a, b) => a.startMinutes - b.startMinutes);
  const blocks =
    saved.length > 0
      ? saved
      : buildBaselineDayPlan({
          date: todayKey,
          config: snapshot.planner,
          tasks: snapshot.tasks,
          events: snapshot.events,
          now,
          timeZone,
        });
  const intro =
    saved.length > 0
      ? `Saved plan for ${formatLongDate(todayKey)}. Sessions come from the planner, which uses your study window, events, and current ranks.`
      : `Nothing is saved for ${formatLongDate(todayKey)} yet. This preview uses the same scheduler as the Planner page. Generate it there to keep it.`;
  if (blocks.length === 0) {
    return `${intro}\n\nThe study window has no blocks. Add open tasks or widen your study hours.`;
  }
  return [
    intro,
    `Window starts at ${snapshot.planner.studyStartTime} for ${snapshot.planner.studyDurationHours}h, with ${snapshot.planner.focusBlockMinutes}m focus blocks.`,
    "",
    ...blocks.map((block) => `• ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)} · ${block.title}${block.completed ? " · done" : ""}`),
  ].join("\n");
}

function courses(snapshot: AssistantSnapshot): string {
  if (snapshot.courses.length === 0) return "You have not added any courses.";
  return [
    `${snapshot.profile.semester || "This semester"} · ${plural(snapshot.courses.length, "course")}:`,
    "",
    ...snapshot.courses.map((course) => {
      const related = snapshot.tasks.filter((task) => task.courseId === course.id);
      const done = related.filter((task) => task.status === "completed").length;
      return `• ${course.code} ${course.name} · ${course.instructor} · ${done}/${related.length} tasks done`;
    }),
  ].join("\n");
}

function career(snapshot: AssistantSnapshot, now: Date): string {
  if (snapshot.goals.length === 0) return "You have no career goals yet.";
  const todayKey = formatDateKey(now, snapshot.profile.timezone);
  return [
    "Career goals, ordered by target date:",
    "",
    ...[...snapshot.goals]
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      .map(
        (goal) =>
          `• ${goal.title} · ${GOAL_CATEGORY_LABEL[goal.category]} · ${goal.progress}% · ${relativeDayLabel(goal.targetDate, todayKey)} · ${goal.status.replaceAll("_", " ")}`,
      ),
  ].join("\n");
}

function campus(snapshot: AssistantSnapshot, now: Date): string {
  const todayKey = formatDateKey(now, snapshot.profile.timezone);
  const events = snapshot.events
    .filter((event) => event.status !== "cancelled" && event.status !== "completed" && isValidDateKey(event.date) && event.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 6);
  const lines = [events.length ? "Upcoming campus events:" : "No upcoming campus events.", ""];
  lines.push(
    ...events.map((event) => `• ${event.title} · ${formatShortDate(event.date)} ${event.startTime} · ${event.location} · ${event.organization}`),
  );
  if (snapshot.responsibilities.length) {
    lines.push("", "Club responsibilities:");
    lines.push(
      ...snapshot.responsibilities.map((item) => `• ${item.organization} · ${item.role} · Next: ${item.nextAction}`),
    );
  }
  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
