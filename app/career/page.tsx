import { CareerScreen } from "@/components/career/career-screen";
import { ScreenFallback } from "@/components/shared/ui-bits";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Career Development" };

export default function CareerPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <CareerScreen />
    </Suspense>
  );
}
