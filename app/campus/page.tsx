import { CampusScreen } from "@/components/campus/campus-screen";
import { ScreenFallback } from "@/components/shared/ui-bits";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Campus Life" };

export default function CampusPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <CampusScreen />
    </Suspense>
  );
}
