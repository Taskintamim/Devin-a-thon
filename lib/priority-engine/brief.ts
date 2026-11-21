import { diffDays, formatDateKey, formatShortDate, parseTimeToMinutes } from "@/lib/dates";
import { courseCode } from "@/lib/labels";
import { isDueOn, isOverdue, recommendTasks, type ScoredTask } from "@/lib/priority-engine";
import { formatDuration } from "@/lib/utils";
import type { CampusEvent, Course, PlannerConfig, Profile, Task } from "@/types";

export interface BriefPriority {
  id: string;
  title: string;
  why: string;
  score: number;
  band: string;
  deadline: string;
  duration: string;
}

export interface DailyBrief {
  headline: string;
  attention: string[];
  approaching: string[];
  priorities: BriefPriority[];
  summary: string;
  capacity: string;
  conflicts: string[];
}

function line(task: Task, courses: Course[]): string {
  return `${task.title} · ${courseCode(courses, task.courseId)} · ${formatShortDate(task.deadlineDate)} ${task.deadlineTime}`;
}

export function buildDailyBrief(options: {
  tasks: Task[];
  courses: Course[];
  profile: Profile;
  now: Date;
  events?: CampusEvent[];
  planner?: PlannerConfig;
}): DailyBrief {
  const { tasks, courses, profile, now } = options;
  const timeZone = profile.timezone;
  const todayKey = formatDateKey(now, timeZone);
  const overdue = tasks.filter((task) => isOverdue(task, now, timeZone));
  const dueToday = tasks.filter((task) => isDueOn(task, todayKey));
  const ranked = recommendTasks(tasks, now, timeZone);
  const approaching = ranked
    .map((item) => item.task)
    .filter((task) => isValidUpcoming(task, todayKey))
    .slice(0, 4);
  const priorities = ranked.slice(0, 3).map((item) => ({
    id: item.task.id,
    title: item.task.title,
    why: item.explanation,
    score: item.score,
    band: item.band,
    deadline: isDeadline(item.task) ? `${formatShortDate(item.task.deadlineDate)} ${item.task.deadlineTime}` : "No deadline",
    duration: Number.isFinite(item.task.estimatedMinutes) && item.task.estimatedMinutes > 0 ? formatDuration(item.task.estimatedMinutes) : "Not set",
  }));
  const attentionCount = new Set([...overdue, ...dueToday].map((task) => task.id)).size;
  const headline =
    attentionCount > 0
      ? `${attentionCount} ${attentionCount === 1 ? "item needs" : "items need"} attention today.`
      : ranked.length > 0
        ? `Nothing is due today. Next up is ${ranked[0].task.title}.`
        : "No open tasks.";
  const attentionTasks = [...overdue, ...dueToday.filter((task) => !overdue.some((item) => item.id === task.id))].slice(0, 5);
  const conflicts = studyConflicts(options.events ?? [], options.planner, todayKey);

  return {
    headline,
    attention: attentionTasks.length > 0 ? attentionTasks.map((task) => line(task, courses)) : ["Nothing is overdue or due today."],
    approaching: approaching.length > 0 ? approaching.map((task) => line(task, courses)) : ["No other deadlines in the next 7 days."],
    priorities,
    summary: summaryText(profile.name.trim(), ranked, overdue.length, dueToday.length),
    capacity: capacityText(profile, options.planner),
    conflicts,
  };
}

function isDeadline(task: Task): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(task.deadlineDate);
}

function isValidUpcoming(task: Task, todayKey: string): boolean {
  return isDeadline(task) && task.deadlineDate > todayKey && diffDays(todayKey, task.deadlineDate) <= 7;
}

function capacityText(profile: Profile, planner?: PlannerConfig): string {
  const hours = planner?.studyDurationHours ?? profile.dailyStudyHours;
  const start = planner?.studyStartTime ?? profile.studyStartTime;
  const days = planner?.studyDays.length ?? 7;
  return `${hours}h from ${start} on ${days} study ${days === 1 ? "day" : "days"} this week.`;
}

function studyConflicts(events: CampusEvent[], planner: PlannerConfig | undefined, todayKey: string): string[] {
  if (!planner) return [];
  const start = parseTimeToMinutes(planner.studyStartTime);
  const end = start + Math.round(planner.studyDurationHours * 60);
  return events
    .filter((event) => event.date === todayKey && event.status !== "cancelled" && event.status !== "completed")
    .filter((event) => {
      const eventStart = parseTimeToMinutes(event.startTime);
      const eventEnd = parseTimeToMinutes(event.endTime);
      return eventEnd > start && eventStart < end;
    })
    .map((event) => `${event.title} overlaps study time (${event.startTime}–${event.endTime}).`);
}

function summaryText(name: string, ranked: ScoredTask[], overdue: number, dueToday: number): string {
  if (ranked.length === 0) {
    return "You have no open tasks. Add the next assignment when it lands so CampusFlow can rank it.";
  }
  const top = ranked[0];
  const who = name ? `${name}, start` : "Start";
  const load =
    overdue > 0
      ? `${overdue} overdue ${overdue === 1 ? "task" : "tasks"} should come before new work.`
      : dueToday > 0
        ? `${dueToday} ${dueToday === 1 ? "task is" : "tasks are"} due today.`
        : "Use the open time for the nearest deadline.";
  return `${who} with ${top.task.title}. ${top.explanation} ${load}`;
}
