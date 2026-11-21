"use client";

import { buildDemoContent } from "@/lib/demo/seed";
import { addDaysToKey, formatDateKey, startOfWeek } from "@/lib/dates";
import { COURSE_COLORS } from "@/lib/labels";
import { buildBaselineDayPlan, buildBaselineWeekPlan, scheduledMinutes } from "@/lib/planner/schedule";
import { commitCampus, getCampusServerSnapshot, getCampusSnapshot, subscribeCampus } from "@/lib/storage/browser-store";
import { createId } from "@/lib/utils";
import {
  courseSchema,
  eventSchema,
  goalSchema,
  parseOrThrow,
  plannerSchema,
  profileSchema,
  responsibilitySchema,
  taskSchema,
  type CourseInput,
  type EventInput,
  type GoalInput,
  type PlannerInput,
  type ProfileInput,
  type ResponsibilityInput,
  type TaskInput,
} from "@/lib/validation";
import type { CampusData, CampusEvent, CareerGoal, Course, Task, TaskStatus } from "@/types";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

interface CampusApi {
  ready: boolean;
  data: CampusData | null;
  mode: "demo" | "notion";
  resetDemo: () => void;
  completeOnboarding: (input: ProfileInput) => void;
  updateProfile: (input: ProfileInput) => void;
  setThemePreference: (theme: "light" | "dark") => void;
  updatePlanner: (input: PlannerInput) => void;
  addTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addCourse: (input: CourseInput) => Promise<void>;
  updateCourse: (id: string, input: CourseInput) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addEvent: (input: EventInput) => Promise<void>;
  updateEvent: (id: string, input: EventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addResponsibility: (input: ResponsibilityInput) => void;
  updateResponsibility: (id: string, input: ResponsibilityInput) => void;
  deleteResponsibility: (id: string) => void;
  addGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: string, input: GoalInput) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  planDay: (date: string) => void;
  planWeek: (weekStart: string) => void;
  toggleBlock: (id: string) => void;
  updateBlock: (id: string, startMinutes: number, endMinutes: number) => void;
  removeBlock: (id: string) => void;
  clearDay: (date: string) => void;
  appendExchange: (userText: string, reply: string) => void;
  clearMessages: () => void;
  setupNotion: (parentPageId: string) => Promise<string>;
  syncFromNotion: () => Promise<string>;
  returnToDemo: () => void;
}

const CampusContext = createContext<CampusApi | null>(null);

function toTask(input: TaskInput, existing?: Task): Task {
  return {
    id: existing?.id ?? createId(),
    ...input,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    completedAt:
      input.status === "completed"
        ? existing?.status === "completed"
          ? existing.completedAt
          : new Date().toISOString()
        : null,
  };
}

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(subscribeCampus, getCampusSnapshot, getCampusServerSnapshot);

  const update = useCallback((recipe: (current: CampusData) => CampusData) => {
    const current = getCampusSnapshot();
    if (!current) throw new Error("CampusFlow is still loading.");
    commitCampus(recipe(current));
  }, []);

  const api = useMemo<CampusApi>(() => {
    const currentData = () => {
      const current = getCampusSnapshot();
      if (!current) throw new Error("CampusFlow is still loading.");
      return current;
    };

    return {
      ready: data !== null,
      data,
      mode: data?.mode ?? "demo",
      resetDemo: () => {
        const current = currentData();
        if (current.mode === "notion") {
          throw new Error("Return to the local workspace before resetting data. Notion records were not changed.");
        }
        const content = buildDemoContent({
          now: new Date(),
          timeZone: current.profile.timezone,
          semester: current.profile.semester,
          planner: current.planner,
        });
        update((state) => ({ ...state, ...content, messages: [] }));
      },
      completeOnboarding: (input) => {
        const profileInput = parseOrThrow(profileSchema, input, "Check your profile");
        update((state) => {
          const profile = { ...state.profile, ...profileInput, onboardingComplete: true };
          const planner = {
            ...state.planner,
            studyStartTime: profile.studyStartTime,
            studyDurationHours: profile.dailyStudyHours,
          };
          const now = new Date();
          const week = startOfWeek(formatDateKey(now, profile.timezone));
          const current = buildBaselineWeekPlan({
            weekStart: week,
            config: planner,
            tasks: state.tasks,
            events: state.events,
            now,
            timeZone: profile.timezone,
          });
          const next = buildBaselineWeekPlan({
            weekStart: addDaysToKey(week, 7),
            config: planner,
            tasks: state.tasks,
            events: state.events,
            reservedMinutes: scheduledMinutes(current),
            now,
            timeZone: profile.timezone,
          });
          return { ...state, profile, planner, blocks: [...current, ...next] };
        });
      },
      updateProfile: (input) => {
        const profileInput = parseOrThrow(profileSchema, input, "Check your profile");
        update((state) => ({
          ...state,
          profile: { ...state.profile, ...profileInput },
          planner: {
            ...state.planner,
            studyStartTime: profileInput.studyStartTime,
            studyDurationHours: profileInput.dailyStudyHours,
          },
        }));
      },
      setThemePreference: (theme) => {
        update((state) => ({ ...state, profile: { ...state.profile, theme } }));
      },
      updatePlanner: (input) => {
        const planner = parseOrThrow(plannerSchema, input, "Check the study settings");
        update((state) => ({
          ...state,
          planner,
          profile: {
            ...state.profile,
            studyStartTime: planner.studyStartTime,
            dailyStudyHours: planner.studyDurationHours,
          },
        }));
      },
      addTask: async (input) => {
        const parsed = parseOrThrow(taskSchema, input, "Check the task");
        const current = currentData();
        const draft = toTask(parsed);
        if (current.mode === "notion") {
          const saved = await writeNotion<Task>("task", "create", sourceId(current, "tasks"), draft, current.courses);
          update((state) => ({ ...state, tasks: [saved, ...state.tasks] }));
          return;
        }
        update((state) => ({ ...state, tasks: [draft, ...state.tasks] }));
      },
      updateTask: async (id, input) => {
        const parsed = parseOrThrow(taskSchema, input, "Check the task");
        const current = currentData();
        const existing = current.tasks.find((task) => task.id === id);
        const draft = toTask(parsed, existing);
        if (current.mode === "notion") {
          const saved = await writeNotion<Task>("task", "update", sourceId(current, "tasks"), { ...draft, id }, current.courses);
          update((state) => ({ ...state, tasks: state.tasks.map((task) => (task.id === id ? saved : task)) }));
          return;
        }
        update((state) => ({ ...state, tasks: state.tasks.map((task) => (task.id === id ? draft : task)) }));
      },
      setTaskStatus: async (id, status) => {
        const current = currentData();
        const existing = current.tasks.find((task) => task.id === id);
        if (!existing) return;
        const next = status === "completed"
          ? { ...existing, status, completedAt: existing.completedAt ?? new Date().toISOString() }
          : { ...existing, status, completedAt: null };
        if (current.mode === "notion") {
          const saved = await writeNotion<Task>("task", "update", sourceId(current, "tasks"), next, current.courses);
          update((state) => applyStatus(state, saved.id, saved));
          return;
        }
        update((state) => applyStatus(state, id, next));
      },
      deleteTask: async (id) => {
        const current = currentData();
        if (current.mode === "notion") {
          await writeNotion("task", "delete", sourceId(current, "tasks"), { id }, current.courses);
        }
        update((state) => ({
          ...state,
          tasks: state.tasks.filter((task) => task.id !== id),
          blocks: state.blocks.filter((block) => block.taskId !== id),
        }));
      },
      addCourse: async (input) => {
        const parsed = parseOrThrow(courseSchema, input, "Check the course");
        const current = currentData();
        if (current.courses.some((course) => course.code.toLowerCase() === parsed.code.toLowerCase())) {
          throw new Error("A course with this code already exists.");
        }
        const draft: Course = { ...parsed, id: createId(), color: COURSE_COLORS[current.courses.length % COURSE_COLORS.length] };
        if (current.mode === "notion") {
          const saved = await writeNotion<Course>("course", "create", sourceId(current, "courses"), draft, current.courses);
          update((state) => ({ ...state, courses: [...state.courses, saved] }));
          return;
        }
        update((state) => ({ ...state, courses: [...state.courses, draft] }));
      },
      updateCourse: async (id, input) => {
        const parsed = parseOrThrow(courseSchema, input, "Check the course");
        const current = currentData();
        if (current.courses.some((course) => course.id !== id && course.code.toLowerCase() === parsed.code.toLowerCase())) {
          throw new Error("A course with this code already exists.");
        }
        const existing = current.courses.find((course) => course.id === id);
        const draft = { ...existing, ...parsed, id, color: existing?.color ?? COURSE_COLORS[0] };
        if (current.mode === "notion") {
          const saved = await writeNotion<Course>("course", "update", sourceId(current, "courses"), draft, current.courses);
          update((state) => ({ ...state, courses: state.courses.map((course) => (course.id === id ? saved : course)) }));
          return;
        }
        update((state) => ({ ...state, courses: state.courses.map((course) => (course.id === id ? draft : course)) }));
      },
      deleteCourse: async (id) => {
        const current = currentData();
        if (current.mode === "notion") await writeNotion("course", "delete", sourceId(current, "courses"), { id }, current.courses);
        update((state) => ({
          ...state,
          courses: state.courses.filter((course) => course.id !== id),
          tasks: state.tasks.map((task) => (task.courseId === id ? { ...task, courseId: null } : task)),
        }));
      },
      addEvent: async (input) => {
        const parsed = parseOrThrow(eventSchema, input, "Check the event");
        const current = currentData();
        const draft: CampusEvent = { ...parsed, id: createId() };
        if (current.mode === "notion") {
          const saved = await writeNotion<CampusEvent>("event", "create", sourceId(current, "events"), draft, current.courses);
          update((state) => ({ ...state, events: [saved, ...state.events] }));
          return;
        }
        update((state) => ({ ...state, events: [draft, ...state.events] }));
      },
      updateEvent: async (id, input) => {
        const parsed = parseOrThrow(eventSchema, input, "Check the event");
        const current = currentData();
        const existing = current.events.find((event) => event.id === id);
        const draft = { ...existing, ...parsed, id };
        if (current.mode === "notion") {
          const saved = await writeNotion<CampusEvent>("event", "update", sourceId(current, "events"), draft, current.courses);
          update((state) => ({ ...state, events: state.events.map((event) => (event.id === id ? saved : event)) }));
          return;
        }
        update((state) => ({ ...state, events: state.events.map((event) => (event.id === id ? draft : event)) }));
      },
      deleteEvent: async (id) => {
        const current = currentData();
        if (current.mode === "notion") await writeNotion("event", "delete", sourceId(current, "events"), { id }, current.courses);
        update((state) => ({ ...state, events: state.events.filter((event) => event.id !== id) }));
      },
      addResponsibility: (input) => {
        const parsed = parseOrThrow(responsibilitySchema, input, "Check the responsibility");
        update((state) => ({
          ...state,
          responsibilities: [{ ...parsed, id: createId() }, ...state.responsibilities],
        }));
      },
      updateResponsibility: (id, input) => {
        const parsed = parseOrThrow(responsibilitySchema, input, "Check the responsibility");
        update((state) => ({
          ...state,
          responsibilities: state.responsibilities.map((item) => (item.id === id ? { ...item, ...parsed } : item)),
        }));
      },
      deleteResponsibility: (id) => {
        update((state) => ({
          ...state,
          responsibilities: state.responsibilities.filter((item) => item.id !== id),
        }));
      },
      addGoal: async (input) => {
        const parsed = parseOrThrow(goalSchema, input, "Check the goal");
        const current = currentData();
        const draft: CareerGoal = { ...parsed, id: createId() };
        if (current.mode === "notion") {
          const saved = await writeNotion<CareerGoal>("goal", "create", sourceId(current, "career"), draft, current.courses);
          update((state) => ({ ...state, goals: [saved, ...state.goals] }));
          return;
        }
        update((state) => ({ ...state, goals: [draft, ...state.goals] }));
      },
      updateGoal: async (id, input) => {
        const parsed = parseOrThrow(goalSchema, input, "Check the goal");
        const current = currentData();
        const existing = current.goals.find((goal) => goal.id === id);
        const draft = { ...existing, ...parsed, id };
        if (current.mode === "notion") {
          const saved = await writeNotion<CareerGoal>("goal", "update", sourceId(current, "career"), draft, current.courses);
          update((state) => ({ ...state, goals: state.goals.map((goal) => (goal.id === id ? saved : goal)) }));
          return;
        }
        update((state) => ({ ...state, goals: state.goals.map((goal) => (goal.id === id ? draft : goal)) }));
      },
      deleteGoal: async (id) => {
        const current = currentData();
        if (current.mode === "notion") await writeNotion("goal", "delete", sourceId(current, "career"), { id }, current.courses);
        update((state) => ({ ...state, goals: state.goals.filter((goal) => goal.id !== id) }));
      },
      planDay: (date) => {
        update((state) => {
          const next = buildBaselineDayPlan({
            date,
            config: state.planner,
            tasks: state.tasks,
            events: state.events,
            existing: state.blocks.filter((block) => block.date === date),
            now: new Date(),
            timeZone: state.profile.timezone,
          });
          const placed = new Set(next.flatMap((block) => (block.taskId ? [block.taskId] : [])));
          return {
            ...state,
            blocks: [
              ...state.blocks.filter((block) => block.date !== date && !(block.taskId && placed.has(block.taskId))),
              ...next,
            ],
          };
        });
      },
      planWeek: (weekStart) => {
        update((state) => {
          const end = addDaysToKey(weekStart, 6);
          const outside = state.blocks.filter((block) => block.date < weekStart || block.date > end);
          const next = buildBaselineWeekPlan({
            weekStart,
            config: state.planner,
            tasks: state.tasks,
            events: state.events,
            existing: state.blocks.filter((block) => block.date >= weekStart && block.date <= end),
            reservedMinutes: scheduledMinutes(outside),
            now: new Date(),
            timeZone: state.profile.timezone,
          });
          const placed = new Set(next.flatMap((block) => (block.taskId ? [block.taskId] : [])));
          return {
            ...state,
            blocks: [...outside.filter((block) => !(block.taskId && placed.has(block.taskId))), ...next],
          };
        });
      },
      toggleBlock: (id) => {
        update((state) => {
          const block = state.blocks.find((item) => item.id === id);
          if (!block || block.kind === "break" || block.kind === "commitment") return state;
          const completed = !block.completed;
          return {
            ...state,
            blocks: state.blocks.map((item) => (item.id === id ? { ...item, completed } : item)),
          };
        });
      },
      updateBlock: (id, startMinutes, endMinutes) => {
        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes - startMinutes < 10) {
          throw new Error("A session needs at least 10 minutes.");
        }
        update((state) => ({
          ...state,
          blocks: state.blocks.map((block) => (block.id === id && block.kind === "task" ? { ...block, startMinutes, endMinutes } : block)),
        }));
      },
      removeBlock: (id) => {
        update((state) => ({ ...state, blocks: state.blocks.filter((block) => block.id !== id) }));
      },
      clearDay: (date) => {
        update((state) => ({ ...state, blocks: state.blocks.filter((block) => block.date !== date) }));
      },
      appendExchange: (userText, reply) => {
        const createdAt = new Date().toISOString();
        update((state) => ({
          ...state,
          messages: [
            ...state.messages,
            { id: createId(), role: "user" as const, content: userText, createdAt },
            { id: createId(), role: "assistant" as const, content: reply, createdAt },
          ].slice(-40),
        }));
      },
      clearMessages: () => {
        update((state) => ({ ...state, messages: [] }));
      },
      setupNotion: async (parentPageId) => {
        const payload = await postJson<{ sources: CampusData["notion"]; message: string }>("/api/notion/setup", { parentPageId });
        update((state) => ({
          ...state,
          notion: { ...state.notion, ...payload.sources, lastError: null },
        }));
        return payload.message;
      },
      syncFromNotion: async () => {
        const current = currentData();
        try {
          const payload = await postJson<{ data: { courses: Course[]; tasks: Task[]; events: CampusEvent[]; goals: CareerGoal[] }; sources: CampusData["notion"]; syncedAt: string; message: string }>("/api/notion/sync", current.notion);
          update((state) => ({
            ...state,
            mode: "notion",
            notion: { ...state.notion, ...payload.sources, lastSyncAt: payload.syncedAt, lastError: null },
            demoBackup: state.mode === "demo" ? { courses: state.courses, tasks: state.tasks, events: state.events, goals: state.goals, blocks: state.blocks } : state.demoBackup,
            courses: payload.data.courses,
            tasks: payload.data.tasks,
            events: payload.data.events,
            goals: payload.data.goals,
            blocks: [],
          }));
          return payload.message;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sync failed.";
          update((state) => ({ ...state, notion: { ...state.notion, lastError: message } }));
          throw error;
        }
      },
      returnToDemo: () => {
        update((state) => {
          if (state.mode !== "notion") return state;
          const backup = state.demoBackup;
          if (!backup) {
            const content = buildDemoContent({
              now: new Date(),
              timeZone: state.profile.timezone,
              semester: state.profile.semester,
              planner: state.planner,
            });
            return { ...state, mode: "demo", ...content, notion: { ...state.notion, lastError: null } };
          }
          return {
            ...state,
            mode: "demo",
            courses: backup.courses,
            tasks: backup.tasks,
            events: backup.events,
            goals: backup.goals,
            blocks: backup.blocks,
            notion: { ...state.notion, lastError: null },
          };
        });
      },
    };
  }, [data, update]);

  return <CampusContext.Provider value={api}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const value = useContext(CampusContext);
  if (!value) throw new Error("useCampus must be used within CampusProvider");
  return value;
}

function sourceId(data: CampusData, key: "tasks" | "courses" | "events" | "career") {
  const map = {
    tasks: data.notion.tasksDataSourceId,
    courses: data.notion.coursesDataSourceId,
    events: data.notion.eventsDataSourceId,
    career: data.notion.careerDataSourceId,
  };
  const id = map[key];
  if (!id) throw new Error(`The Notion ${key} data source is not configured. Run workspace setup in Settings.`);
  return id;
}

function applyStatus(state: CampusData, id: string, task: Task): CampusData {
  return {
    ...state,
    tasks: state.tasks.map((item) => (item.id === id ? task : item)),
    blocks: task.status === "completed" ? state.blocks.map((block) => (block.taskId === id ? { ...block, completed: true } : block)) : state.blocks,
  };
}

async function writeNotion<T>(entity: string, action: string, dataSourceId: string, record: unknown, courses: Course[]): Promise<T> {
  const payload = await postJson<{ record: T }>("/api/notion/records", { entity, action, dataSourceId, record, courses });
  return payload.record;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Notion request failed.");
  }
  return payload;
}
