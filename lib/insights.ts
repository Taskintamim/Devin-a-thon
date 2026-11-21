import { addDaysToKey, formatDateKey, formatLongDate, weekdayIndex, weekdayShort, zonedHour } from "@/lib/dates";
import { buildDailyBrief, type DailyBrief } from "@/lib/priority-engine/brief";
import { isOverdue, rankTasks, type ScoredTask } from "@/lib/priority-engine";
import { CATEGORY_LABEL } from "@/lib/labels";
import type { CampusData, Task, TaskCategory } from "@/types";

export interface WeeklyPoint {
  key: string;
  label: string;
  completed: number;
  fill: string;
}

export interface StatusSlice {
  name: string;
  value: number;
  fill: string;
}

export interface CourseActivity {
  code: string;
  tasks: number;
  fill: string;
}

export interface CategorySlice {
  name: string;
  value: number;
  fill: string;
}

export interface AnalysisReport {
  headline: string;
  workload: string;
  progress: string;
  focus: string;
  risk: string;
}

export interface Insights {
  todayKey: string;
  greeting: string;
  dateLabel: string;
  activeCount: number;
  completedCount: number;
  pendingAssignments: number;
  overdue: Task[];
  dueToday: Task[];
  upcomingDeadlines: Task[];
  examsAhead: Task[];
  priorities: ScoredTask[];
  brief: DailyBrief;
  weekly: WeeklyPoint[];
  statusMix: StatusSlice[];
  courseActivity: CourseActivity[];
  categoryMix: CategorySlice[];
  analysis: AnalysisReport;
  study: { completedMinutes: number; plannedMinutes: number; percent: number };
}

const WEEKLY_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#f97316", "#ef4444"];
const COURSE_FALLBACK = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6", "#a855f7", "#22c55e", "#ef4444"];
const CATEGORY_COLORS: Record<TaskCategory, string> = {
  assignment: "#3b82f6",
  exam: "#ef4444",
  project: "#a855f7",
  reading: "#14b8a6",
  study: "#10b981",
  admin: "#f59e0b",
};

export function buildInsights(data: CampusData, now: Date): Insights {
  const timeZone = data.profile.timezone;
  const todayKey = formatDateKey(now, timeZone);
  const hour = zonedHour(now, timeZone);
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = data.profile.name.trim();
  const openTasks = data.tasks.filter((task) => task.status !== "completed");
  const overdue = data.tasks.filter((task) => isOverdue(task, now, timeZone));
  const dueToday = openTasks.filter((task) => task.deadlineDate === todayKey);
  const priorities = rankTasks(openTasks, now, timeZone).slice(0, 4);
  const upcomingDeadlines = [...openTasks]
    .filter((task) => task.category === "assignment" || task.category === "exam" || task.category === "project")
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate) || a.deadlineTime.localeCompare(b.deadlineTime))
    .slice(0, 6);
  const examsAhead = openTasks
    .filter((task) => task.category === "exam" && task.deadlineDate >= todayKey)
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));

  const weekKeys = Array.from({ length: 7 }, (_, index) => addDaysToKey(todayKey, index - 6));
  const weekly = weekKeys.map((key, index) => ({
    key,
    label: weekdayShort(key),
    completed: data.tasks.filter((task) => task.completedAt && formatDateKey(new Date(task.completedAt), timeZone) === key).length,
    fill: WEEKLY_COLORS[index % WEEKLY_COLORS.length],
  }));

  const statusMix: StatusSlice[] = [
    { name: "Not started", value: data.tasks.filter((task) => task.status === "not_started").length, fill: "#94a3b8" },
    { name: "In progress", value: data.tasks.filter((task) => task.status === "in_progress").length, fill: "#3b82f6" },
    { name: "Completed", value: data.tasks.filter((task) => task.status === "completed").length, fill: "#22c55e" },
  ].filter((slice) => slice.value > 0);

  const courseActivity: CourseActivity[] = data.courses
    .map((course, index) => ({
      code: course.code,
      tasks: data.tasks.filter((task) => task.courseId === course.id).length,
      fill: course.color || COURSE_FALLBACK[index % COURSE_FALLBACK.length],
    }))
    .filter((course) => course.tasks > 0);

  const categoryMix: CategorySlice[] = (Object.keys(CATEGORY_COLORS) as TaskCategory[])
    .map((category) => ({
      name: CATEGORY_LABEL[category],
      value: openTasks.filter((task) => task.category === category).length,
      fill: CATEGORY_COLORS[category],
    }))
    .filter((slice) => slice.value > 0);

  const studyDayCount = weekKeys.filter((key) => data.planner.studyDays.includes(weekdayIndex(key))).length;
  const plannedMinutes = studyDayCount * data.profile.dailyStudyHours * 60;
  const completedMinutes = data.tasks
    .filter((task) => task.completedAt && weekKeys.includes(formatDateKey(new Date(task.completedAt), timeZone)))
    .reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const studyPercent = plannedMinutes === 0 ? 0 : Math.min(100, Math.round((completedMinutes / plannedMinutes) * 100));
  const top = priorities[0];
  const completionRate = data.tasks.length === 0 ? 0 : Math.round((data.tasks.filter((task) => task.status === "completed").length / data.tasks.length) * 100);

  const analysis: AnalysisReport = {
    headline:
      overdue.length > 0
        ? `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"} need immediate attention.`
        : dueToday.length > 0
          ? `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today — stay on schedule.`
          : openTasks.length === 0
            ? "Workload is clear. Add new work when the next deadline lands."
            : "No overdue work. Keep momentum on the ranked priorities.",
    workload: `${name || "Student"} has ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} across ${data.courses.length} course${data.courses.length === 1 ? "" : "s"} at ${data.profile.university || "your university"}. ${dueToday.length} due today, ${examsAhead.length} exam${examsAhead.length === 1 ? "" : "s"} ahead.`,
    progress: `Completion rate is ${completionRate}%. This week you logged ${Math.round(completedMinutes / 60)}h ${completedMinutes % 60}m of an estimated ${Math.round(plannedMinutes / 60)}h study plan (${studyPercent}%).`,
    focus: top
      ? `Top focus: “${top.task.title}” (score ${top.score}, ${top.band}). ${top.explanation}`
      : "No open tasks to prioritize right now.",
    risk:
      overdue.length > 0
        ? `Risk: ${overdue.map((task) => task.title).slice(0, 2).join(" · ")}${overdue.length > 2 ? ` +${overdue.length - 2} more` : ""} past deadline.`
        : examsAhead[0]
          ? `Next exam: ${examsAhead[0].title} on ${examsAhead[0].deadlineDate}.`
          : "No critical deadline risk detected today.",
  };

  return {
    todayKey,
    greeting: name ? `${part}, ${name}` : part,
    dateLabel: formatLongDate(todayKey),
    activeCount: openTasks.length,
    completedCount: data.tasks.filter((task) => task.status === "completed").length,
    pendingAssignments: openTasks.filter((task) => task.category === "assignment").length,
    overdue,
    dueToday,
    upcomingDeadlines,
    examsAhead,
    priorities,
    brief: buildDailyBrief({
      tasks: data.tasks,
      courses: data.courses,
      profile: data.profile,
      now,
      events: data.events,
      planner: data.planner,
    }),
    weekly,
    statusMix,
    courseActivity,
    categoryMix,
    analysis,
    study: {
      completedMinutes,
      plannedMinutes,
      percent: studyPercent,
    },
  };
}
