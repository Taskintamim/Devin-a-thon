"use client";

import { FormField, PageHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { TIMEZONES } from "@/lib/labels";
import { fieldErrors, profileSchema } from "@/lib/validation";
import { NotionPanel } from "@/components/settings/notion-panel";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

export function SettingsScreen() {
  const { data, updateProfile, setThemePreference, resetDemo } = useCampus();
  const { setTheme } = useTheme();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  if (!data) return null;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = profileSchema.safeParse({
      name: form.get("name"),
      university: form.get("university"),
      semester: form.get("semester"),
      dailyStudyHours: form.get("dailyStudyHours"),
      studyStartTime: form.get("studyStartTime"),
      timezone: form.get("timezone"),
      theme: data?.profile.theme,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    if (!parsed.data.name.trim()) {
      setErrors({ name: "Name is required in settings." });
      return;
    }
    updateProfile(parsed.data);
    setErrors({});
    toast.success("Profile saved");
  }

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader eyebrow="Settings" title="Workspace" description={`Profile and sync options for ${data.profile.name || "your account"}${data.profile.university ? ` · ${data.profile.university}` : ""}.`} />
      <form onSubmit={save} className="max-w-xl space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <FormField label="Name" error={errors.name}><Input name="name" defaultValue={data.profile.name} /></FormField>
        <FormField label="University" error={errors.university}><Input name="university" defaultValue={data.profile.university} /></FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Semester" error={errors.semester}><Input name="semester" defaultValue={data.profile.semester} /></FormField>
          <FormField label="Daily study hours" error={errors.dailyStudyHours}><Input name="dailyStudyHours" type="number" min={1} max={14} step={0.5} defaultValue={data.profile.dailyStudyHours} /></FormField>
          <FormField label="Study start" error={errors.studyStartTime}><Input name="studyStartTime" type="time" defaultValue={data.profile.studyStartTime} /></FormField>
          <FormField label="Timezone" error={errors.timezone}>
            <Select name="timezone" defaultValue={data.profile.timezone}>
              {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </Select>
          </FormField>
        </div>
        <Button type="submit">Save profile</Button>
      </form>

      <section className="max-w-xl rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current theme: {data.profile.theme}.</p>
        <div className="mt-3 flex gap-2">
          {(["dark", "light"] as const).map((theme) => (
            <Button key={theme} variant={data.profile.theme === theme ? "default" : "outline"} onClick={() => { setTheme(theme); setThemePreference(theme); }}>
              {theme === "dark" ? "Dark" : "Light"}
            </Button>
          ))}
        </div>
      </section>

      <section id="demo" className="max-w-xl scroll-mt-20 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Local data</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Tasks, courses, events, goals, and plans for {data.profile.name || "this student"} are stored in this browser. Resetting replaces academic data with a fresh sample set and keeps your profile. It does not sync anywhere.
        </p>
        <Button className="mt-3" variant="outline" onClick={() => setConfirmReset(true)}>Reset local data</Button>
      </section>

      <NotionPanel />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset local data"
        body="Replace tasks, courses, events, goals, plans, and assistant history with a fresh sample dataset? Your profile stays."
        confirmLabel="Reset data"
        onConfirm={() => {
          try {
            resetDemo();
            toast.success("Local data reset on this device");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not reset local data");
          }
        }}
      />
    </div>
  );
}
