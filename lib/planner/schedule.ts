import { addDaysToKey, formatDateKey, parseTimeToMinutes, weekdayIndex } from "@/lib/dates";
import { isValidDateKey, recommendTasks, safeDuration } from "@/lib/priority-engine";
import { createId } from "@/lib/utils";
import type { CampusEvent, PlannerConfig, Task, TimeBlock } from "@/types";

/**
 * Baseline study-window scheduler.
 * Part 2 should replace `buildBaselineWeekPlan` with the intelligent scheduler.
 * Callers depend on the returned `TimeBlock` shape, not on this placement order.
 */

export interface PlanChunk {
  task: Task;
  minutes: number;
  note?: string;
}

export function usableFocusMinutes(config: PlannerConfig): number {
  const total = Math.round(config.studyDurationHours * 60);
  const focus = Math.max(10, config.focusBlockMinutes);
  const gap = Math.max(0, config.breakMinutes);
  if (gap === 0) return total;
  const cycle = focus + gap;
  const fullCycles = Math.floor(total / cycle);
  const remainder = total % cycle;
  return fullCycles * focus + Math.min(focus, remainder);
}

export function scheduledMinutes(blocks: TimeBlock[]): Map<string, number> {
  const minutes = new Map<string, number>();
  for (const block of blocks) {
    if (!block.taskId || block.kind !== "task") continue;
    minutes.set(block.taskId, (minutes.get(block.taskId) ?? 0) + (block.endMinutes - block.startMinutes));
  }
  return minutes;
}

function studyDaysInWeek(weekStart: string, config: PlannerConfig, today: string): string[] {
  const days: string[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDaysToKey(weekStart, offset);
    if (date < today) continue;
    if (!config.studyDays.includes(weekdayIndex(date))) continue;
    days.push(date);
  }
  return days;
}

function nextDay(days: string[], current: string): string | null {
  const index = days.indexOf(current);
  if (index < 0 || index + 1 >= days.length) return null;
  return days[index + 1];
}

function lastAllowedDay(days: string[], deadline: string, today: string): string | null {
  if (days.length === 0) return null;
  if (deadline < today) return days[days.length - 1];
  const within = days.filter((day) => day <= deadline);
  return within.length > 0 ? within[within.length - 1] : null;
}

function focusRoomOnDay(config: PlannerConfig, date: string, task: Task, today: string): number {
  const full = usableFocusMinutes(config);
  if (!isValidDateKey(task.deadlineDate) || task.deadlineDate < today || date < task.deadlineDate) return full;
  if (date > task.deadlineDate) return 0;
  const start = parseTimeToMinutes(config.studyStartTime);
  const end = start + Math.round(config.studyDurationHours * 60);
  const deadline = parseTimeToMinutes(task.deadlineTime || "23:59");
  const available = Math.min(end, deadline) - start;
  if (!Number.isFinite(available) || available < 10) return 0;
  return Math.min(full, available);
}

function layOutDay(options: {
  date: string;
  config: PlannerConfig;
  chunks: PlanChunk[];
  completed: Set<string>;
  busy?: Array<[number, number, string]>;
}): TimeBlock[] {
  const start = parseTimeToMinutes(options.config.studyStartTime);
  const end = start + Math.round(options.config.studyDurationHours * 60);
  const busy = (options.busy ?? [])
    .map(([from, to, title]) => [Math.max(from, start), Math.min(to, end), title] as [number, number, string])
    .filter(([from, to]) => to - from >= 5);
  const blocks: TimeBlock[] = [];

  const push = (block: Omit<TimeBlock, "id" | "date">) => {
    if (block.endMinutes - block.startMinutes < 5) return;
    blocks.push({ ...block, id: createId(), date: options.date });
  };

  for (const [from, to, title] of busy) {
    push({ startMinutes: from, endMinutes: to, title, kind: "commitment", completed: false, note: "Existing commitment" });
  }

  if (options.chunks.length === 0) {
    return blocks.sort((a, b) => a.startMinutes - b.startMinutes);
  }

  let cursor = start;
  const jumpBusy = () => {
    for (const [from, to] of busy) {
      if (cursor >= from && cursor < to) cursor = to;
    }
  };

  for (const chunk of options.chunks) {
    let left = chunk.minutes;
    while (left > 0 && cursor < end) {
      jumpBusy();
      if (cursor >= end) break;
      const nextBusy = busy.find(([from]) => from > cursor)?.[0] ?? end;
      const room = Math.min(end, nextBusy) - cursor;
      if (room < 10) {
        cursor = nextBusy;
        continue;
      }
      const span = Math.min(options.config.focusBlockMinutes, left, room);
      if (span < 10) {
        cursor = nextBusy;
        continue;
      }
      push({
        startMinutes: cursor,
        endMinutes: cursor + span,
        title: chunk.task.title,
        kind: "task",
        taskId: chunk.task.id,
        completed: options.completed.has(`${options.date}:${chunk.task.id}`),
        note: chunk.note,
      });
      cursor += span;
      left -= span;
      if (left > 0 && options.config.breakMinutes > 0) {
        jumpBusy();
        const breakRoom = Math.min(end, busy.find(([from]) => from > cursor)?.[0] ?? end) - cursor;
        const breakSpan = Math.min(options.config.breakMinutes, breakRoom);
        if (breakSpan >= 5) {
          push({
            startMinutes: cursor,
            endMinutes: cursor + breakSpan,
            title: "Break",
            kind: "break",
            completed: false,
          });
          cursor += breakSpan;
        }
      }
    }
  }

  jumpBusy();
  const openEnd = busy.find(([from]) => from > cursor)?.[0] ?? end;
  if (openEnd - cursor >= 30 && cursor < end) {
    push({
      startMinutes: cursor,
      endMinutes: Math.min(openEnd, end),
      title: "Open study",
      kind: "focus",
      completed: false,
    });
  }

  return blocks.sort((a, b) => a.startMinutes - b.startMinutes || a.title.localeCompare(b.title));
}

function busyForDate(events: CampusEvent[] | undefined, date: string): Array<[number, number, string]> {
  const ranges = (events ?? [])
    .filter((event) => event.date === date && event.status !== "cancelled")
    .map((event) => [parseTimeToMinutes(event.startTime), parseTimeToMinutes(event.endTime), event.title] as [number, number, string])
    .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to > from)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number, string]> = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1]);
      if (!previous[2].includes(range[2])) previous[2] = `${previous[2]}, ${range[2]}`;
      continue;
    }
    merged.push([...range]);
  }
  return merged;
}

function blockedMinutes(config: PlannerConfig, busy: Array<[number, number, string]>): number {
  const start = parseTimeToMinutes(config.studyStartTime);
  const end = start + Math.round(config.studyDurationHours * 60);
  return busy.reduce((sum, [from, to]) => {
    const overlap = Math.min(to, end) - Math.max(from, start);
    return sum + Math.max(0, overlap);
  }, 0);
}

export function buildBaselineWeekPlan(options: {
  weekStart: string;
  config: PlannerConfig;
  tasks: Task[];
  events?: CampusEvent[];
  existing?: TimeBlock[];
  reservedMinutes?: Map<string, number>;
  now: Date;
  timeZone: string;
}): TimeBlock[] {
  const today = formatDateKey(options.now, options.timeZone);
  const days = studyDaysInWeek(options.weekStart, options.config, today);
  const ranked = recommendTasks(options.tasks, options.now, options.timeZone);
  const load = new Map<string, number>(days.map((day) => [day, 0]));
  const buckets = new Map<string, PlanChunk[]>(days.map((day) => [day, []]));
  const reserved = options.reservedMinutes ?? new Map<string, number>();

  for (const scored of ranked) {
    const limit = schedulingLimit(days, scored.task, today);
    if (!limit) continue;
    let cursor: string | null = days[0] ?? null;
    const estimate = safeDuration(scored.task.estimatedMinutes) ?? 60;
    let minutesLeft = estimate - (reserved.get(scored.task.id) ?? 0);
    while (minutesLeft > 0 && cursor) {
      if (isValidDateKey(scored.task.deadlineDate) && cursor > limit) break;
      const room = focusRoomOnDay(options.config, cursor, scored.task, today);
      if (room < 10) {
        cursor = nextDay(days, cursor);
        continue;
      }
      const busy = busyForDate(options.events, cursor);
      const capacity = Math.max(0, Math.min(room, usableFocusMinutes(options.config) - blockedMinutes(options.config, busy)));
      const free = capacity - (load.get(cursor) ?? 0);
      if (free < 10) {
        cursor = nextDay(days, cursor);
        continue;
      }
      const chunk = Math.min(minutesLeft, free);
      buckets.get(cursor)?.push({ task: scored.task, minutes: chunk, note: scored.explanation });
      load.set(cursor, (load.get(cursor) ?? 0) + chunk);
      minutesLeft -= chunk;
      if (minutesLeft > 0) cursor = nextDay(days, cursor);
    }
  }

  const completed = new Set(
    (options.existing ?? [])
      .filter((block) => block.completed && block.taskId)
      .map((block) => `${block.date}:${block.taskId}`),
  );

  return days.flatMap((date) =>
    layOutDay({
      date,
      config: options.config,
      chunks: buckets.get(date) ?? [],
      completed,
      busy: busyForDate(options.events, date),
    }),
  );
}

function schedulingLimit(days: string[], task: Task, today: string): string | null {
  if (!isValidDateKey(task.deadlineDate)) return days[days.length - 1] ?? null;
  return lastAllowedDay(days, task.deadlineDate, today);
}

export function buildBaselineDayPlan(options: {
  date: string;
  config: PlannerConfig;
  tasks: Task[];
  events?: CampusEvent[];
  existing?: TimeBlock[];
  now: Date;
  timeZone: string;
}): TimeBlock[] {
  const today = formatDateKey(options.now, options.timeZone);
  const ranked = recommendTasks(options.tasks, options.now, options.timeZone);
  const busy = busyForDate(options.events, options.date);
  let free = Math.max(0, usableFocusMinutes(options.config) - blockedMinutes(options.config, busy));
  const chunks: PlanChunk[] = [];
  const placed = new Set<string>();
  for (const scored of ranked) {
    if (free < 10) break;
    if (placed.has(scored.task.id)) continue;
    if (isValidDateKey(scored.task.deadlineDate) && scored.task.deadlineDate < options.date && options.date !== today) continue;
    const room = focusRoomOnDay(options.config, options.date, scored.task, today);
    if (room < 10) continue;
    const estimate = safeDuration(scored.task.estimatedMinutes) ?? 60;
    const minutes = Math.min(estimate, free, room);
    chunks.push({ task: scored.task, minutes, note: scored.explanation });
    placed.add(scored.task.id);
    free -= minutes;
  }
  const completed = new Set(
    (options.existing ?? [])
      .filter((block) => block.completed && block.taskId)
      .map((block) => `${block.date}:${block.taskId}`),
  );
  return layOutDay({
    date: options.date,
    config: options.config,
    chunks,
    completed,
    busy,
  });
}

export function tasksMissingFromWeek(options: {
  tasks: Task[];
  blocks: TimeBlock[];
  weekStart: string;
  today: string;
}): Task[] {
  const weekEnd = addDaysToKey(options.weekStart, 6);
  const scheduled = new Set(
    options.blocks
      .filter((block) => block.date >= options.weekStart && block.date <= weekEnd && block.taskId)
      .map((block) => block.taskId),
  );
  const currentWeek = options.weekStart <= options.today && options.today <= weekEnd;
  return options.tasks.filter((task) => {
    if (task.status === "completed" || scheduled.has(task.id)) return false;
    const dueThisWeek = isValidDateKey(task.deadlineDate) && task.deadlineDate >= options.weekStart && task.deadlineDate <= weekEnd;
    const carriedOverdue = currentWeek && isValidDateKey(task.deadlineDate) && task.deadlineDate < options.weekStart;
    return dueThisWeek || carriedOverdue;
  });
}

export function unscheduledReason(task: Task, today: string): string {
  if (!isValidDateKey(task.deadlineDate)) return "No valid deadline, and the open study days were already full.";
  if (task.deadlineDate < today) return "Overdue, and the remaining study time this week is full.";
  return "Not enough study time on or before the deadline.";
}
