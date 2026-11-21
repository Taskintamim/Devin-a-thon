import { diffDays, formatDateKey } from "@/lib/dates";
import { formatDuration } from "@/lib/utils";
import type { Priority, Task, TaskCategory } from "@/types";

/**
 * Deterministic priority score, normalized to 0–100.
 *
 * score = 0.40 * urgency + 0.30 * importance + 0.15 * academic + 0.15 * durationFit
 *
 * Each component is itself 0–100.
 * - Urgency: overdue 100, today 92, tomorrow 78, then decays by day. Missing or invalid deadlines score 20.
 * - Importance: critical 100, high 75, medium 50, low 25.
 * - Academic relevance: exam 100, assignment 85, project 70, study 55, reading 40, admin 20.
 * - Duration fit: shorter work that fits a normal block scores higher. Missing duration scores 50.
 *
 * Completed tasks score 0 and are omitted from `recommendTasks`.
 */

export const PRIORITY_WEIGHTS = {
  urgency: 0.4,
  importance: 0.3,
  academic: 0.15,
  duration: 0.15,
} as const;

export type PriorityBand = "critical" | "high" | "medium" | "low" | "completed";

export interface ScoredTask {
  task: Task;
  score: number;
  band: PriorityBand;
  explanation: string;
  reasons: string[];
}

const IMPORTANCE: Record<Priority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const ACADEMIC: Record<TaskCategory, number> = {
  exam: 100,
  assignment: 85,
  project: 70,
  study: 55,
  reading: 40,
  admin: 20,
};

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function safeDuration(minutes: unknown): number | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.min(24 * 60, Math.round(minutes));
}

export function compareDeadlines(a: Task, b: Task): number {
  const aValid = isValidDateKey(a.deadlineDate);
  const bValid = isValidDateKey(b.deadlineDate);
  if (aValid !== bValid) return aValid ? -1 : 1;
  if (!aValid || !bValid) return 0;
  if (a.deadlineDate !== b.deadlineDate) return a.deadlineDate < b.deadlineDate ? -1 : 1;
  if (a.deadlineTime === b.deadlineTime) return 0;
  return a.deadlineTime < b.deadlineTime ? -1 : 1;
}

export function isOverdue(task: Task, now: Date, timeZone: string): boolean {
  if (task.status === "completed" || !isValidDateKey(task.deadlineDate)) return false;
  return task.deadlineDate < formatDateKey(now, timeZone);
}

export function isDueOn(task: Task, dateKey: string): boolean {
  return task.status !== "completed" && isValidDateKey(task.deadlineDate) && task.deadlineDate === dateKey;
}

export function priorityBand(score: number, completed: boolean): PriorityBand {
  if (completed) return "completed";
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function urgencyScore(task: Task, today: string): { value: number; reason: string } {
  if (!isValidDateKey(task.deadlineDate)) {
    return { value: 20, reason: "no valid deadline" };
  }
  if (task.deadlineDate < today) {
    const days = Math.max(1, diffDays(task.deadlineDate, today));
    return { value: 100, reason: days === 1 ? "overdue by 1 day" : `overdue by ${days} days` };
  }
  const days = diffDays(today, task.deadlineDate);
  if (days === 0) return { value: 92, reason: "due today" };
  if (days === 1) return { value: 78, reason: "due tomorrow" };
  if (days <= 3) return { value: 64, reason: `due in ${days} days` };
  if (days <= 7) return { value: 46, reason: `due in ${days} days` };
  if (days <= 14) return { value: 28, reason: `due in ${days} days` };
  return { value: 12, reason: `due in ${days} days` };
}

function durationScore(minutes: number | null): { value: number; reason: string } {
  if (minutes === null) return { value: 50, reason: "duration not set" };
  if (minutes <= 50) return { value: 90, reason: `about ${formatDuration(minutes)}` };
  if (minutes <= 120) return { value: 70, reason: `about ${formatDuration(minutes)}` };
  if (minutes <= 180) return { value: 50, reason: `about ${formatDuration(minutes)}` };
  return { value: 30, reason: `about ${formatDuration(minutes)}` };
}

export function scoreTask(task: Task, now: Date, timeZone: string): ScoredTask {
  if (task.status === "completed") {
    return {
      task,
      score: 0,
      band: "completed",
      explanation: `${task.title} is already completed.`,
      reasons: ["Completed"],
    };
  }

  const today = formatDateKey(now, timeZone);
  const urgency = urgencyScore(task, today);
  const importance = IMPORTANCE[task.priority] ?? 50;
  const academic = ACADEMIC[task.category] ?? 40;
  const duration = durationScore(safeDuration(task.estimatedMinutes));
  const raw =
    PRIORITY_WEIGHTS.urgency * urgency.value +
    PRIORITY_WEIGHTS.importance * importance +
    PRIORITY_WEIGHTS.academic * academic +
    PRIORITY_WEIGHTS.duration * duration.value;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const band = priorityBand(score, false);
  const importanceLabel = task.priority;
  const explanation = `${band[0].toUpperCase()}${band.slice(1)} priority (${score}): ${task.title} is ${urgency.reason}, has ${importanceLabel} importance, and takes ${duration.reason}.`;
  const reasons = [
    urgency.reason[0].toUpperCase() + urgency.reason.slice(1),
    `${importanceLabel[0].toUpperCase()}${importanceLabel.slice(1)} importance`,
    task.category === "admin" ? "Lower academic weight" : `${task.category[0].toUpperCase()}${task.category.slice(1)}`,
    duration.reason[0].toUpperCase() + duration.reason.slice(1),
  ];
  if (task.status === "in_progress") reasons.push("Already in progress");

  return { task, score, band, explanation, reasons };
}

export function rankTasks(tasks: Task[], now: Date, timeZone: string): ScoredTask[] {
  return tasks
    .map((task) => scoreTask(task, now, timeZone))
    .sort((a, b) => b.score - a.score || compareDeadlines(a.task, b.task) || a.task.id.localeCompare(b.task.id));
}

export function recommendTasks(tasks: Task[], now: Date, timeZone: string): ScoredTask[] {
  return rankTasks(
    tasks.filter((task) => task.status !== "completed"),
    now,
    timeZone,
  );
}
