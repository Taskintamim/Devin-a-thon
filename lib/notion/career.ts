import type { Client } from "@notionhq/client";
import { archiveRecord, createRecord, queryAllPages, updateRecord } from "@/lib/notion/records";
import { goalToProperties, pageToGoal } from "@/lib/notion/properties";
import type { CareerGoal } from "@/types";

export async function listGoals(notion: Client, dataSourceId: string): Promise<CareerGoal[]> {
  const pages = await queryAllPages(notion, dataSourceId);
  return pages.map((page) => pageToGoal(page)).filter((goal): goal is CareerGoal => goal !== null);
}

export async function createGoal(notion: Client, dataSourceId: string, goal: CareerGoal): Promise<CareerGoal> {
  const page = await createRecord(notion, dataSourceId, goalToProperties(goal));
  return pageToGoal(page) ?? { ...goal, id: page.id };
}

export async function updateGoal(notion: Client, goal: CareerGoal): Promise<CareerGoal> {
  const page = await updateRecord(notion, goal.id, goalToProperties(goal));
  return pageToGoal(page) ?? goal;
}

export async function deleteGoal(notion: Client, pageId: string) {
  await archiveRecord(notion, pageId);
}
