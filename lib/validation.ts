import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  description: z.string().trim().max(2000),
  courseId: z.union([z.string(), z.null()]).transform((value) => (value ? value : null)),
  deadlineDate: dateSchema,
  deadlineTime: timeSchema,
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["not_started", "in_progress", "completed"]),
  estimatedMinutes: z.coerce.number().int().min(10, "Estimate at least 10 minutes").max(720),
  category: z.enum(["assignment", "exam", "study", "project", "reading", "admin"]),
});

export const courseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required").max(120),
  code: z.string().trim().min(1, "Course code is required").max(20),
  instructor: z.string().trim().min(1, "Instructor is required").max(80),
  creditHours: z.coerce.number().min(0.5, "Credits must be at least 0.5").max(12),
  semester: z.string().trim().min(1, "Semester is required").max(40),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(140),
    category: z.enum(["club", "workshop", "career", "social", "volunteer", "academic"]),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    location: z.string().trim().min(1, "Location is required").max(120),
    description: z.string().trim().max(2000),
    status: z.enum(["upcoming", "attending", "completed", "cancelled"]),
    organization: z.string().trim().min(1, "Organization is required").max(80),
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "End time must be after the start time",
  });

export const responsibilitySchema = z.object({
  organization: z.string().trim().min(1, "Organization is required").max(80),
  role: z.string().trim().min(1, "Role is required").max(80),
  commitment: z.string().trim().min(1, "Commitment is required").max(160),
  nextAction: z.string().trim().min(1, "Next action is required").max(200),
});

export const goalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  category: z.enum(["skill", "project", "internship", "certification", "portfolio", "milestone"]),
  status: z.enum(["not_started", "in_progress", "completed"]),
  targetDate: dateSchema,
  notes: z.string().trim().max(2000),
  progress: z.coerce.number().int().min(0).max(100),
});

export const profileSchema = z.object({
  name: z.string().trim().max(80),
  university: z.string().trim().max(120),
  semester: z.string().trim().min(1, "Semester is required").max(40),
  dailyStudyHours: z.coerce.number().min(1, "Study at least 1 hour").max(14),
  studyStartTime: timeSchema,
  timezone: z.string().trim().min(1, "Timezone is required"),
  theme: z.enum(["light", "dark"]),
});

export const plannerSchema = z.object({
  studyStartTime: timeSchema,
  studyDurationHours: z.coerce.number().min(1).max(14),
  breakMinutes: z.coerce.number().int().min(0).max(60),
  focusBlockMinutes: z.coerce.number().int().min(20).max(180),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1, "Choose at least one study day"),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type ResponsibilityInput = z.infer<typeof responsibilitySchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PlannerInput = z.infer<typeof plannerSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, fallback: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? fallback);
  }
  return parsed.data;
}
