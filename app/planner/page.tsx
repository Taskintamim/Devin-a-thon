import { ScreenFallback } from "@/components/shared/ui-bits";
import { PlannerScreen } from "@/components/planner/planner-screen";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Smart Planner" };

export default function PlannerPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <PlannerScreen />
    </Suspense>
  );
}
