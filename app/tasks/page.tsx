import { ScreenFallback } from "@/components/shared/ui-bits";
import { TasksScreen } from "@/components/tasks/tasks-screen";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <TasksScreen />
    </Suspense>
  );
}
