import { createInitialCampus, emptyNotion } from "@/lib/demo/seed";
import type { CampusData } from "@/types";

export const STORAGE_KEY = "campusflow.os.v2";
const LEGACY_KEY = "campusflow.os.v1";

export function parseCampus(raw: string): CampusData {
  return normalizeCampus(JSON.parse(raw) as Partial<CampusData>);
}

export function loadCampus(): CampusData {
  if (typeof window === "undefined") return createInitialCampus();
  return readStoredCampus() ?? createInitialCampus();
}

export function readStoredCampus(): CampusData | null {
  if (typeof window === "undefined") return null;
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) {
    try {
      return parseCampus(current);
    } catch {
      return null;
    }
  }
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    return parseCampus(legacy);
  } catch {
    return null;
  }
}

export function saveCampus(data: CampusData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Could not save data on this device. Free some browser storage and try again.");
  }
}

function normalizeCampus(parsed: Omit<Partial<CampusData>, "version"> & { version?: number }): CampusData {
  const fresh = createInitialCampus();
  const version = parsed.version;
  if ((version !== 1 && version !== 2) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.courses)) return fresh;
  return {
    version: 2,
    mode: parsed.mode === "notion" ? "notion" : "demo",
    notion: { ...emptyNotion(), ...parsed.notion },
    demoBackup: parsed.demoBackup ?? null,
    profile: { ...fresh.profile, ...parsed.profile, onboardingComplete: Boolean(parsed.profile?.onboardingComplete) },
    courses: parsed.courses,
    tasks: parsed.tasks,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    planner: { ...fresh.planner, ...parsed.planner },
    blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
  };
}
