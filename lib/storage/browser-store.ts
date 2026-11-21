import { createInitialCampus } from "@/lib/demo/seed";
import { parseCampus, readStoredCampus, saveCampus, STORAGE_KEY } from "@/lib/storage/local";
import type { CampusData } from "@/types";

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedData: CampusData | null = null;
let persistQueued = false;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeCampus(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCampusSnapshot(): CampusData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (cachedData && (raw === null || raw === cachedRaw)) return cachedData;

  if (!raw) {
    const stored = readStoredCampus();
    const initial = stored ?? createInitialCampus();
    const serialized = JSON.stringify(initial);
    cachedData = initial;
    cachedRaw = serialized;
    if (!persistQueued) {
      persistQueued = true;
      queueMicrotask(() => {
        persistQueued = false;
        if (window.localStorage.getItem(STORAGE_KEY) === null) {
          window.localStorage.setItem(STORAGE_KEY, serialized);
          cachedRaw = serialized;
        }
      });
    }
    return cachedData;
  }

  try {
    cachedData = parseCampus(raw);
    cachedRaw = raw;
  } catch {
    cachedData = createInitialCampus();
    cachedRaw = raw;
  }
  return cachedData;
}

export function getCampusServerSnapshot(): CampusData | null {
  return null;
}

export function commitCampus(next: CampusData) {
  saveCampus(next);
  cachedData = next;
  cachedRaw = JSON.stringify(next);
  emit();
}
