import type { Course, EventCategory, EventStatus, GoalCategory, GoalStatus, Priority, Task, TaskCategory, TaskStatus, CampusEvent, CareerGoal } from "@/types";
import { COURSE_COLORS } from "@/lib/labels";

export const TASK_SOURCE = "CampusFlow Tasks";
export const COURSE_SOURCE = "CampusFlow Courses";
export const EVENT_SOURCE = "CampusFlow Events";
export const CAREER_SOURCE = "CampusFlow Career";

type PropertyBag = Record<string, unknown>;

export interface NotionPageLike {
  id: string;
  last_edited_time?: string;
  in_trash?: boolean;
  archived?: boolean;
  properties: PropertyBag;
}

const text = (content: string) => [{ type: "text" as const, text: { content: content.slice(0, 1900) } }];

export function taskProperties() {
  return {
    Title: { type: "title", title: {} },
    Description: { type: "rich_text", rich_text: {} },
    Course: { type: "rich_text", rich_text: {} },
    Deadline: { type: "date", date: {} },
    Priority: { type: "select", select: { options: named("Low", "Medium", "High", "Critical") } },
    Status: { type: "select", select: { options: named("Not Started", "In Progress", "Completed") } },
    "Estimated Duration": { type: "number", number: { format: "number" } },
    Category: { type: "select", select: { options: named("Assignment", "Exam", "Study", "Project", "Reading", "Admin") } },
  };
}

export function courseProperties() {
  return {
    "Course Name": { type: "title", title: {} },
    "Course Code": { type: "rich_text", rich_text: {} },
    Instructor: { type: "rich_text", rich_text: {} },
    Credits: { type: "number", number: { format: "number" } },
    Semester: { type: "rich_text", rich_text: {} },
  };
}

export function eventProperties() {
  return {
    Title: { type: "title", title: {} },
    Category: { type: "select", select: { options: named("Club", "Workshop", "Career", "Social", "Volunteer", "Academic") } },
    Date: { type: "date", date: {} },
    "Start Time": { type: "rich_text", rich_text: {} },
    "End Time": { type: "rich_text", rich_text: {} },
    Location: { type: "rich_text", rich_text: {} },
    Description: { type: "rich_text", rich_text: {} },
    Status: { type: "select", select: { options: named("Upcoming", "Attending", "Completed", "Cancelled") } },
    Organization: { type: "rich_text", rich_text: {} },
  };
}

export function careerProperties() {
  return {
    Title: { type: "title", title: {} },
    Category: { type: "select", select: { options: named("Skill", "Project", "Internship", "Certification", "Portfolio", "Milestone") } },
    Status: { type: "select", select: { options: named("Not Started", "In Progress", "Completed") } },
    "Target Date": { type: "date", date: {} },
    Notes: { type: "rich_text", rich_text: {} },
    Progress: { type: "number", number: { format: "number" } },
  };
}

function named(...names: string[]) {
  return names.map((name) => ({ name }));
}

export function taskToProperties(task: Task, courseCode = "") {
  return {
    Title: { title: text(task.title || "Untitled") },
    Description: { rich_text: text(task.description || "") },
    Course: { rich_text: text(courseCode) },
    Deadline: { date: task.deadlineDate ? { start: task.deadlineDate } : null },
    Priority: { select: { name: labelPriority(task.priority) } },
    Status: { select: { name: labelTaskStatus(task.status) } },
    "Estimated Duration": { number: Number.isFinite(task.estimatedMinutes) ? task.estimatedMinutes : null },
    Category: { select: { name: labelTaskCategory(task.category) } },
  };
}

export function pageToTask(page: NotionPageLike, courses: Course[]): Task | null {
  if (page.in_trash || page.archived) return null;
  const title = readTitle(page.properties.Title) || readTitle(page.properties.Name);
  if (!title) return null;
  const code = readText(page.properties.Course);
  const course = courses.find((item) => item.code.toLowerCase() === code.toLowerCase());
  return {
    id: page.id,
    title,
    description: readText(page.properties.Description),
    courseId: course?.id ?? null,
    deadlineDate: readDate(page.properties.Deadline) ?? "",
    deadlineTime: "23:59",
    priority: parsePriority(readSelect(page.properties.Priority)),
    status: parseTaskStatus(readSelect(page.properties.Status)),
    estimatedMinutes: readNumber(page.properties["Estimated Duration"]) ?? 60,
    category: parseTaskCategory(readSelect(page.properties.Category)),
    createdAt: page.last_edited_time ?? new Date(0).toISOString(),
    completedAt: parseTaskStatus(readSelect(page.properties.Status)) === "completed" ? page.last_edited_time ?? null : null,
  };
}

export function courseToProperties(course: Course) {
  return {
    "Course Name": { title: text(course.name || "Untitled course") },
    "Course Code": { rich_text: text(course.code) },
    Instructor: { rich_text: text(course.instructor) },
    Credits: { number: course.creditHours },
    Semester: { rich_text: text(course.semester) },
  };
}

export function pageToCourse(page: NotionPageLike, index: number): Course | null {
  if (page.in_trash || page.archived) return null;
  const name = readTitle(page.properties["Course Name"]) || readTitle(page.properties.Name);
  if (!name) return null;
  return {
    id: page.id,
    name,
    code: readText(page.properties["Course Code"]) || "COURSE",
    instructor: readText(page.properties.Instructor) || "Unknown",
    creditHours: readNumber(page.properties.Credits) ?? 3,
    semester: readText(page.properties.Semester) || "",
    color: COURSE_COLORS[index % COURSE_COLORS.length],
  };
}

export function eventToProperties(event: CampusEvent) {
  return {
    Title: { title: text(event.title || "Untitled event") },
    Category: { select: { name: labelEventCategory(event.category) } },
    Date: { date: event.date ? { start: event.date } : null },
    "Start Time": { rich_text: text(event.startTime) },
    "End Time": { rich_text: text(event.endTime) },
    Location: { rich_text: text(event.location) },
    Description: { rich_text: text(event.description) },
    Status: { select: { name: labelEventStatus(event.status) } },
    Organization: { rich_text: text(event.organization) },
  };
}

export function pageToEvent(page: NotionPageLike): CampusEvent | null {
  if (page.in_trash || page.archived) return null;
  const title = readTitle(page.properties.Title) || readTitle(page.properties.Name);
  if (!title) return null;
  return {
    id: page.id,
    title,
    category: parseEventCategory(readSelect(page.properties.Category)),
    date: readDate(page.properties.Date) ?? "",
    startTime: readText(page.properties["Start Time"]) || "09:00",
    endTime: readText(page.properties["End Time"]) || "10:00",
    location: readText(page.properties.Location) || "TBA",
    description: readText(page.properties.Description),
    status: parseEventStatus(readSelect(page.properties.Status)),
    organization: readText(page.properties.Organization) || "Campus",
  };
}

export function goalToProperties(goal: CareerGoal) {
  return {
    Title: { title: text(goal.title || "Untitled goal") },
    Category: { select: { name: labelGoalCategory(goal.category) } },
    Status: { select: { name: labelGoalStatus(goal.status) } },
    "Target Date": { date: goal.targetDate ? { start: goal.targetDate } : null },
    Notes: { rich_text: text(goal.notes) },
    Progress: { number: goal.progress },
  };
}

export function pageToGoal(page: NotionPageLike): CareerGoal | null {
  if (page.in_trash || page.archived) return null;
  const title = readTitle(page.properties.Title) || readTitle(page.properties.Name);
  if (!title) return null;
  return {
    id: page.id,
    title,
    category: parseGoalCategory(readSelect(page.properties.Category)),
    status: parseGoalStatus(readSelect(page.properties.Status)),
    targetDate: readDate(page.properties["Target Date"]) ?? "",
    notes: readText(page.properties.Notes),
    progress: Math.max(0, Math.min(100, readNumber(page.properties.Progress) ?? 0)),
  };
}

export function readTitle(property: unknown): string {
  return readText(property);
}

export function readText(property: unknown): string {
  if (!property || typeof property !== "object") return "";
  const value = property as { title?: Rich[]; rich_text?: Rich[] };
  const items = value.title ?? value.rich_text ?? [];
  return items.map((item) => item.plain_text ?? item.text?.content ?? "").join("").trim();
}

export function readSelect(property: unknown): string {
  if (!property || typeof property !== "object") return "";
  const select = (property as { select?: { name?: string } | null }).select;
  return select?.name ?? "";
}

export function readNumber(property: unknown): number | null {
  if (!property || typeof property !== "object") return null;
  const number = (property as { number?: number | null }).number;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

export function readDate(property: unknown): string | null {
  if (!property || typeof property !== "object") return null;
  const start = (property as { date?: { start?: string } | null }).date?.start;
  if (!start) return null;
  return start.slice(0, 10);
}

type Rich = { plain_text?: string; text?: { content?: string } };

function labelPriority(value: Priority): string {
  return { low: "Low", medium: "Medium", high: "High", critical: "Critical" }[value];
}
function labelTaskStatus(value: TaskStatus): string {
  return { not_started: "Not Started", in_progress: "In Progress", completed: "Completed" }[value];
}
function labelTaskCategory(value: TaskCategory): string {
  return { assignment: "Assignment", exam: "Exam", study: "Study", project: "Project", reading: "Reading", admin: "Admin" }[value];
}
function labelEventCategory(value: EventCategory): string {
  return value[0].toUpperCase() + value.slice(1);
}
function labelEventStatus(value: EventStatus): string {
  return { upcoming: "Upcoming", attending: "Attending", completed: "Completed", cancelled: "Cancelled" }[value];
}
function labelGoalCategory(value: GoalCategory): string {
  return value[0].toUpperCase() + value.slice(1);
}
function labelGoalStatus(value: GoalStatus): string {
  return labelTaskStatus(value);
}

function parsePriority(value: string): Priority {
  const found = (["low", "medium", "high", "critical"] as Priority[]).find((item) => labelPriority(item).toLowerCase() === value.toLowerCase());
  return found ?? "medium";
}
function parseTaskStatus(value: string): TaskStatus {
  const map: Record<string, TaskStatus> = { "not started": "not_started", "in progress": "in_progress", completed: "completed" };
  return map[value.toLowerCase()] ?? "not_started";
}
function parseTaskCategory(value: string): TaskCategory {
  const found = (["assignment", "exam", "study", "project", "reading", "admin"] as TaskCategory[]).find((item) => item === value.toLowerCase());
  return found ?? "assignment";
}
function parseEventCategory(value: string): EventCategory {
  const found = (["club", "workshop", "career", "social", "volunteer", "academic"] as EventCategory[]).find((item) => item === value.toLowerCase());
  return found ?? "academic";
}
function parseEventStatus(value: string): EventStatus {
  const map: Record<string, EventStatus> = { upcoming: "upcoming", attending: "attending", completed: "completed", cancelled: "cancelled" };
  return map[value.toLowerCase()] ?? "upcoming";
}
function parseGoalCategory(value: string): GoalCategory {
  const found = (["skill", "project", "internship", "certification", "portfolio", "milestone"] as GoalCategory[]).find((item) => item === value.toLowerCase());
  return found ?? "milestone";
}
function parseGoalStatus(value: string): GoalStatus {
  return parseTaskStatus(value);
}
