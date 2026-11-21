import type {
  Course,
  EventCategory,
  EventStatus,
  GoalCategory,
  GoalStatus,
  Priority,
  TaskCategory,
  TaskStatus,
} from "@/types";

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  assignment: "Assignment",
  exam: "Exam",
  study: "Study",
  project: "Project",
  reading: "Reading",
  admin: "Admin",
};

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  club: "Club",
  workshop: "Workshop",
  career: "Career",
  social: "Social",
  volunteer: "Volunteer",
  academic: "Academic",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  attending: "Attending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  skill: "Skill",
  project: "Project",
  internship: "Internship",
  certification: "Certification",
  portfolio: "Portfolio",
  milestone: "Milestone",
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const TIMEZONES = [
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "UTC",
] as const;

export const COURSE_COLORS = [
  "#2dd4bf",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#fb923c",
  "#818cf8",
];

export function courseById(courses: Course[], courseId: string | null): Course | null {
  if (!courseId) return null;
  return courses.find((course) => course.id === courseId) ?? null;
}

export function courseCode(courses: Course[], courseId: string | null): string {
  return courseById(courses, courseId)?.code ?? "General";
}

export function courseName(courses: Course[], courseId: string | null): string {
  const course = courseById(courses, courseId);
  if (!course) return "General";
  return `${course.code} · ${course.name}`;
}
