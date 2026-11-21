export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function zonedHour(date: Date, timeZone: string): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  return Number(value);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function diffDays(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split("-").map(Number);
  const [y2, m2, d2] = toKey.split("-").map(Number);
  const from = Date.UTC(y1, m1 - 1, d1);
  const to = Date.UTC(y2, m2 - 1, d2);
  return Math.round((to - from) / 86_400_000);
}

export function weekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function weekdayShort(dateKey: string): string {
  return WEEKDAY_LABELS[weekdayIndex(dateKey)];
}

export function startOfWeek(dateKey: string): string {
  return addDaysToKey(dateKey, -weekdayIndex(dateKey));
}

export function formatLongDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  const nextYear = utc.getUTCFullYear();
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${mins.toString().padStart(2, "0")} ${period}`;
}

export function relativeDayLabel(dateKey: string, todayKey: string): string {
  const delta = diffDays(todayKey, dateKey);
  if (!Number.isFinite(delta)) return "No deadline";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta < 0) return `${Math.abs(delta)}d overdue`;
  if (delta < 7) return weekdayShort(dateKey);
  return formatShortDate(dateKey);
}
