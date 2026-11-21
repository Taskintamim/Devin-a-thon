export type Priority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "not_started" | "in_progress" | "completed";

export type TaskCategory =
  | "assignment"
  | "exam"
  | "study"
  | "project"
  | "reading"
  | "admin";

export interface Task {
  id: string;
  title: string;
  description: string;
  courseId: string | null;
  deadlineDate: string;
  deadlineTime: string;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number;
  category: TaskCategory;
  createdAt: string;
  completedAt: string | null;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  creditHours: number;
  semester: string;
  color: string;
}

export type EventCategory =
  | "club"
  | "workshop"
  | "career"
  | "social"
  | "volunteer"
  | "academic";

export type EventStatus = "upcoming" | "attending" | "completed" | "cancelled";

export interface CampusEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  status: EventStatus;
  organization: string;
}

export interface ClubResponsibility {
  id: string;
  organization: string;
  role: string;
  commitment: string;
  nextAction: string;
}

export type GoalCategory =
  | "skill"
  | "project"
  | "internship"
  | "certification"
  | "portfolio"
  | "milestone";

export type GoalStatus = "not_started" | "in_progress" | "completed";

export interface CareerGoal {
  id: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  targetDate: string;
  notes: string;
  progress: number;
}

export interface Profile {
  name: string;
  university: string;
  semester: string;
  dailyStudyHours: number;
  studyStartTime: string;
  timezone: string;
  theme: "light" | "dark";
  onboardingComplete: boolean;
}

export interface PlannerConfig {
  studyStartTime: string;
  studyDurationHours: number;
  breakMinutes: number;
  focusBlockMinutes: number;
  studyDays: number[];
}

export type BlockKind = "task" | "break" | "focus" | "commitment";

export interface TimeBlock {
  id: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  title: string;
  kind: BlockKind;
  taskId?: string;
  completed: boolean;
  note?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type DataMode = "demo" | "notion";

export interface NotionSourceIds {
  parentPageId: string;
  tasksDataSourceId: string;
  coursesDataSourceId: string;
  eventsDataSourceId: string;
  careerDataSourceId: string;
}

export interface NotionConnection {
  parentPageId: string;
  tasksDataSourceId: string;
  coursesDataSourceId: string;
  eventsDataSourceId: string;
  careerDataSourceId: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface DemoBackup {
  courses: Course[];
  tasks: Task[];
  events: CampusEvent[];
  goals: CareerGoal[];
  blocks: TimeBlock[];
}

export interface CampusData {
  version: 2;
  mode: DataMode;
  notion: NotionConnection;
  demoBackup: DemoBackup | null;
  profile: Profile;
  courses: Course[];
  tasks: Task[];
  events: CampusEvent[];
  responsibilities: ClubResponsibility[];
  goals: CareerGoal[];
  planner: PlannerConfig;
  blocks: TimeBlock[];
  messages: AssistantMessage[];
}

export interface AssistantSnapshot {
  profile: Profile;
  courses: Course[];
  tasks: Task[];
  events: CampusEvent[];
  responsibilities: ClubResponsibility[];
  goals: CareerGoal[];
  planner: PlannerConfig;
  blocks: TimeBlock[];
}

export interface AssistantReply {
  content: string;
  engine: "rules";
}
