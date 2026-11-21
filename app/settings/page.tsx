import { SettingsScreen } from "@/components/settings/settings-screen";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
