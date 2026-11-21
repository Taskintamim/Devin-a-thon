import { CoursesScreen } from "@/components/courses/courses-screen";
import { ScreenFallback } from "@/components/shared/ui-bits";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <CoursesScreen />
    </Suspense>
  );
}
