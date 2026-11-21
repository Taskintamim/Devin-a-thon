import { addDaysToKey, formatDateKey, startOfWeek } from "@/lib/dates";
import { buildBaselineWeekPlan, scheduledMinutes } from "@/lib/planner/schedule";
import { createId } from "@/lib/utils";
import type {
  CampusData,
  CampusEvent,
  CareerGoal,
  ClubResponsibility,
  Course,
  NotionConnection,
  PlannerConfig,
  Profile,
  Task,
} from "@/types";

export const DEMO_TIMEZONE = "Asia/Dhaka";

export function defaultProfile(): Profile {
  return {
    name: "",
    university: "",
    semester: "Fall 2026",
    dailyStudyHours: 3,
    studyStartTime: "19:00",
    timezone: DEMO_TIMEZONE,
    theme: "dark",
    onboardingComplete: false,
  };
}

export function defaultPlanner(profile: Profile = defaultProfile()): PlannerConfig {
  return {
    studyStartTime: profile.studyStartTime,
    studyDurationHours: profile.dailyStudyHours,
    breakMinutes: 10,
    focusBlockMinutes: 50,
    studyDays: [0, 1, 2, 3, 4, 5, 6],
  };
}

export function buildDemoContent(options: {
  now?: Date;
  timeZone?: string;
  semester?: string;
  planner?: PlannerConfig;
}): Pick<CampusData, "courses" | "tasks" | "events" | "responsibilities" | "goals" | "planner" | "blocks"> {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? DEMO_TIMEZONE;
  const semester = options.semester ?? "Fall 2026";
  const today = formatDateKey(now, timeZone);
  const planner = options.planner ?? defaultPlanner();
  const courses = createCourses(semester);
  const courseId = Object.fromEntries(courses.map((course) => [course.code, course.id]));
  const tasks = createTasks(today, courseId, now);
  const events = createEvents(today);
  const responsibilities = createResponsibilities();
  const goals = createGoals(today);
  const weekStart = startOfWeek(today);
  const currentWeek = buildBaselineWeekPlan({
    weekStart,
    config: planner,
    tasks,
    now,
    timeZone,
  });
  const nextWeek = buildBaselineWeekPlan({
    weekStart: addDaysToKey(weekStart, 7),
    config: planner,
    tasks,
    reservedMinutes: scheduledMinutes(currentWeek),
    now,
    timeZone,
  });

  return {
    courses,
    tasks,
    events,
    responsibilities,
    goals,
    planner,
    blocks: [...currentWeek, ...nextWeek],
  };
}

export function emptyNotion(): NotionConnection {
  return {
    parentPageId: "",
    tasksDataSourceId: "",
    coursesDataSourceId: "",
    eventsDataSourceId: "",
    careerDataSourceId: "",
    lastSyncAt: null,
    lastError: null,
  };
}

export function createInitialCampus(now = new Date()): CampusData {
  const profile = defaultProfile();
  const content = buildDemoContent({ now, timeZone: profile.timezone, semester: profile.semester });
  return {
    version: 2,
    mode: "demo",
    notion: emptyNotion(),
    demoBackup: null,
    profile,
    messages: [],
    ...content,
  };
}

function createCourses(semester: string): Course[] {
  const rows: Omit<Course, "id" | "semester">[] = [
    { code: "CSE 310", name: "Database Systems", instructor: "Dr. Farhana Islam", creditHours: 3, color: "#2dd4bf" },
    { code: "CSE 321", name: "Operating Systems", instructor: "Prof. Kamal Hossain", creditHours: 3, color: "#38bdf8" },
    { code: "CSE 315", name: "Computer Networks", instructor: "Dr. Nadia Chowdhury", creditHours: 3, color: "#a78bfa" },
    { code: "CSE 307", name: "Software Engineering", instructor: "Ms. Lina Akter", creditHours: 3, color: "#fb7185" },
    { code: "MAT 241", name: "Probability & Statistics", instructor: "Dr. Rezaul Karim", creditHours: 3, color: "#fbbf24" },
    { code: "CSE 299", name: "Junior Design Studio", instructor: "Mr. Arif Mahmud", creditHours: 2, color: "#34d399" },
  ];
  return rows.map((row) => ({ ...row, id: createId(), semester }));
}

function createTasks(today: string, courseId: Record<string, string>, now: Date): Task[] {
  const day = (offset: number) => addDaysToKey(today, offset);
  const createdAt = new Date(now.getTime() - 8 * 86_400_000).toISOString();
  const completedOn = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

  const rows: Array<Omit<Task, "id" | "createdAt"> & { createdAt?: string }> = [
    {
      title: "ER diagram for the library schema",
      description: "Submit the conceptual and logical model for the library case, including cardinalities.",
      courseId: courseId["CSE 310"],
      deadlineDate: day(-2),
      deadlineTime: "23:59",
      priority: "critical",
      status: "not_started",
      estimatedMinutes: 120,
      category: "assignment",
      completedAt: null,
    },
    {
      title: "Stats reading quiz",
      description: "Finish the conditional probability reading and the short Moodle quiz.",
      courseId: courseId["MAT 241"],
      deadlineDate: day(-1),
      deadlineTime: "18:00",
      priority: "high",
      status: "not_started",
      estimatedMinutes: 45,
      category: "reading",
      completedAt: null,
    },
    {
      title: "Process scheduling worksheet",
      description: "Work the FCFS, SJF, and round-robin examples from chapter 5.",
      courseId: courseId["CSE 321"],
      deadlineDate: day(0),
      deadlineTime: "21:00",
      priority: "high",
      status: "in_progress",
      estimatedMinutes: 90,
      category: "assignment",
      completedAt: null,
    },
    {
      title: "Sprint retro notes",
      description: "Capture what the team will change before the next design-studio critique.",
      courseId: courseId["CSE 307"],
      deadlineDate: day(0),
      deadlineTime: "22:30",
      priority: "medium",
      status: "not_started",
      estimatedMinutes: 30,
      category: "admin",
      completedAt: null,
    },
    {
      title: "Wireshark lab report",
      description: "Explain the TCP handshake captures and answer the lab questions.",
      courseId: courseId["CSE 315"],
      deadlineDate: day(1),
      deadlineTime: "23:59",
      priority: "high",
      status: "in_progress",
      estimatedMinutes: 150,
      category: "assignment",
      completedAt: null,
    },
    {
      title: "SQL practice set",
      description: "Complete the join and aggregation exercises before the lab.",
      courseId: courseId["CSE 310"],
      deadlineDate: day(2),
      deadlineTime: "17:00",
      priority: "medium",
      status: "in_progress",
      estimatedMinutes: 80,
      category: "study",
      completedAt: null,
    },
    {
      title: "Prototype critique slides",
      description: "Prepare six slides on the campus transit concept and the open usability issues.",
      courseId: courseId["CSE 299"],
      deadlineDate: day(3),
      deadlineTime: "15:00",
      priority: "high",
      status: "not_started",
      estimatedMinutes: 120,
      category: "project",
      completedAt: null,
    },
    {
      title: "Operating systems midterm",
      description: "Closed-book exam covering processes, threads, scheduling, and synchronization.",
      courseId: courseId["CSE 321"],
      deadlineDate: day(4),
      deadlineTime: "09:00",
      priority: "critical",
      status: "not_started",
      estimatedMinutes: 180,
      category: "exam",
      completedAt: null,
    },
    {
      title: "Bayes theorem exercises",
      description: "Solve the practice sheet Dr. Karim posted after Tuesday's lecture.",
      courseId: courseId["MAT 241"],
      deadlineDate: day(5),
      deadlineTime: "23:59",
      priority: "low",
      status: "not_started",
      estimatedMinutes: 70,
      category: "study",
      completedAt: null,
    },
    {
      title: "Networks quiz",
      description: "Short quiz on delay, throughput, and the application-layer protocols.",
      courseId: courseId["CSE 315"],
      deadlineDate: day(6),
      deadlineTime: "11:00",
      priority: "medium",
      status: "not_started",
      estimatedMinutes: 60,
      category: "exam",
      completedAt: null,
    },
    {
      title: "Requirements specification draft",
      description: "Write the user stories and acceptance criteria for the team project.",
      courseId: courseId["CSE 307"],
      deadlineDate: day(8),
      deadlineTime: "23:59",
      priority: "medium",
      status: "not_started",
      estimatedMinutes: 140,
      category: "assignment",
      completedAt: null,
    },
    {
      title: "Design log update",
      description: "Add this week's research notes and decisions to the studio log.",
      courseId: courseId["CSE 299"],
      deadlineDate: day(9),
      deadlineTime: "20:00",
      priority: "low",
      status: "not_started",
      estimatedMinutes: 40,
      category: "admin",
      completedAt: null,
    },
    {
      title: "Normalize the library schema",
      description: "Submitted the 3NF notes from last week's lab.",
      courseId: courseId["CSE 310"],
      deadlineDate: day(-6),
      deadlineTime: "23:59",
      priority: "medium",
      status: "completed",
      estimatedMinutes: 90,
      category: "assignment",
      completedAt: completedOn(2),
    },
    {
      title: "Read OSC chapter 3",
      description: "Processes chapter notes are in the course notebook.",
      courseId: courseId["CSE 321"],
      deadlineDate: day(-4),
      deadlineTime: "23:59",
      priority: "low",
      status: "completed",
      estimatedMinutes: 60,
      category: "reading",
      completedAt: completedOn(1),
    },
    {
      title: "Team charter draft",
      description: "Roles, meeting time, and definition of done are agreed.",
      courseId: courseId["CSE 307"],
      deadlineDate: day(-5),
      deadlineTime: "23:59",
      priority: "medium",
      status: "completed",
      estimatedMinutes: 45,
      category: "project",
      completedAt: completedOn(4),
    },
    {
      title: "Probability problem set 1",
      description: "Counting and axioms set, graded and returned.",
      courseId: courseId["MAT 241"],
      deadlineDate: day(-7),
      deadlineTime: "23:59",
      priority: "medium",
      status: "completed",
      estimatedMinutes: 75,
      category: "assignment",
      completedAt: completedOn(3),
    },
  ];

  return rows.map((row) => ({
    ...row,
    id: createId(),
    createdAt: row.createdAt ?? createdAt,
  }));
}

function createEvents(today: string): CampusEvent[] {
  const day = (offset: number) => addDaysToKey(today, offset);
  const rows: Omit<CampusEvent, "id">[] = [
    {
      title: "Line-following workshop",
      category: "workshop",
      date: day(0),
      startTime: "19:30",
      endTime: "21:00",
      location: "Engineering Lab 2",
      description: "Build and tune a line-following robot. Bring a laptop.",
      status: "attending",
      organization: "Robotics Club",
    },
    {
      title: "Debate practice",
      category: "club",
      date: day(2),
      startTime: "16:30",
      endTime: "18:00",
      location: "Room 304, Humanities",
      description: "Practice motions for the inter-university friendly.",
      status: "upcoming",
      organization: "Debate Society",
    },
    {
      title: "Fall career fair",
      category: "career",
      date: day(4),
      startTime: "10:00",
      endTime: "15:00",
      location: "University Gym",
      description: "Employers from product and infrastructure teams. Bring a printed resume.",
      status: "attending",
      organization: "Career Center",
    },
    {
      title: "Northbridge hack night",
      category: "academic",
      date: day(6),
      startTime: "18:00",
      endTime: "22:00",
      location: "Innovation Hub",
      description: "Four-hour build night. Teams of three, theme announced at the door.",
      status: "upcoming",
      organization: "Computer Club",
    },
    {
      title: "Peer tutoring drive",
      category: "volunteer",
      date: day(9),
      startTime: "15:00",
      endTime: "17:00",
      location: "Library Lawn",
      description: "First-year calculus and programming help desk.",
      status: "upcoming",
      organization: "Volunteer Network",
    },
    {
      title: "Robotics stand-up",
      category: "club",
      date: day(-1),
      startTime: "17:00",
      endTime: "17:30",
      location: "Club Room B",
      description: "Weekly check-in. Parts order was confirmed.",
      status: "completed",
      organization: "Robotics Club",
    },
  ];
  return rows.map((row) => ({ ...row, id: createId() }));
}

function createResponsibilities(): ClubResponsibility[] {
  return [
    {
      id: createId(),
      organization: "Robotics Club",
      role: "Workshop coordinator",
      commitment: "One workshop each month",
      nextAction: "Confirm Engineering Lab 2 is unlocked before 7:15 PM",
    },
    {
      id: createId(),
      organization: "Debate Society",
      role: "Timekeeper",
      commitment: "Practice twice a month",
      nextAction: "Print the two motions for Thursday",
    },
    {
      id: createId(),
      organization: "Computer Club",
      role: "Member",
      commitment: "Hack night team",
      nextAction: "Submit the team form with Nabila and Farhan",
    },
  ];
}

function createGoals(today: string): CareerGoal[] {
  const day = (offset: number) => addDaysToKey(today, offset);
  const rows: Omit<CareerGoal, "id">[] = [
    {
      title: "TypeScript for production apps",
      category: "skill",
      status: "in_progress",
      targetDate: day(30),
      notes: "Generics, narrowing, and typed API clients. Practice inside the studio project.",
      progress: 65,
    },
    {
      title: "Operating systems internals",
      category: "skill",
      status: "in_progress",
      targetDate: day(21),
      notes: "Be able to explain scheduling and synchronization without notes before the midterm.",
      progress: 40,
    },
    {
      title: "Campus transit dashboard",
      category: "project",
      status: "in_progress",
      targetDate: day(40),
      notes: "Personal project: live shuttle ETAs for Northbridge. Keep it separate from the studio grade.",
      progress: 55,
    },
    {
      title: "PixelForge internship application",
      category: "internship",
      status: "in_progress",
      targetDate: day(12),
      notes: "Backend intern role. Resume is ready. Still need a short cover note and the transcript.",
      progress: 25,
    },
    {
      title: "AWS Cloud Practitioner",
      category: "certification",
      status: "not_started",
      targetDate: day(60),
      notes: "Use the official practice exam only after the OS midterm.",
      progress: 10,
    },
    {
      title: "Career center resume review",
      category: "milestone",
      status: "not_started",
      targetDate: day(14),
      notes: "Book a 20-minute review before the career fair follow-ups.",
      progress: 0,
    },
  ];
  return rows.map((row) => ({ ...row, id: createId() }));
}
