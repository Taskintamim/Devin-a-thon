"use client";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FormField } from "@/components/shared/ui-bits";
import { useCampus } from "@/hooks/use-campus";
import { TIMEZONES } from "@/lib/labels";
import { fieldErrors, profileSchema } from "@/lib/validation";
import { useState } from "react";
import { toast } from "sonner";

export function Onboarding() {
  const { data, completeOnboarding } = useCampus();
  const profile = data?.profile;
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    university: profile?.university ?? "",
    semester: profile?.semester || "Fall 2026",
    dailyStudyHours: String(profile?.dailyStudyHours ?? 3),
    studyStartTime: profile?.studyStartTime ?? "19:00",
    timezone: profile?.timezone ?? "Asia/Dhaka",
    theme: profile?.theme ?? "dark",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(skip: boolean) {
    const payload = {
      ...form,
      name: skip && !form.name.trim() ? "" : form.name,
      university: skip && !form.university.trim() ? "" : form.university,
    };
    if (!skip && !payload.name.trim()) {
      setErrors({ name: "Name is required, or skip for now." });
      return;
    }
    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    completeOnboarding(parsed.data);
    toast.success(skip ? "Demo profile saved" : `Welcome, ${parsed.data.name}`);
  }

  return (
    <div className="cf-ambient grid min-h-screen lg:grid-cols-[minmax(0,420px)_1fr]">
      <section className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">CF</span>
          <span className="text-sm font-semibold">CampusFlow OS</span>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Welcome</p>
          <h1 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight">Your university life. One intelligent system.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            CampusFlow ranks what to do next from your courses, deadlines, and study hours. Data stays on this device until you connect Notion.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Stored on this device. Nothing is synced.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <form
          className="w-full max-w-md space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(false);
          }}
        >
          <div className="lg:hidden">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Welcome</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Set up CampusFlow</h1>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight">Set up your workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">You can skip anything you do not want to fill in yet.</p>
          </div>
          <FormField label="Name" htmlFor="name" error={errors.name}>
            <Input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ayaan Rahman" />
          </FormField>
          <FormField label="University" htmlFor="university" error={errors.university}>
            <Input id="university" value={form.university} onChange={(event) => setForm({ ...form, university: event.target.value })} placeholder="Northbridge University" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Semester" htmlFor="semester" error={errors.semester}>
              <Input id="semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
            </FormField>
            <FormField label="Daily study hours" htmlFor="hours" error={errors.dailyStudyHours}>
              <Input id="hours" type="number" min={1} max={14} step={0.5} value={form.dailyStudyHours} onChange={(event) => setForm({ ...form, dailyStudyHours: event.target.value })} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Study start" htmlFor="start" error={errors.studyStartTime}>
              <Input id="start" type="time" value={form.studyStartTime} onChange={(event) => setForm({ ...form, studyStartTime: event.target.value })} />
            </FormField>
            <FormField label="Timezone" htmlFor="timezone" error={errors.timezone}>
              <Select id="timezone" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })}>
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit">Start CampusFlow</Button>
            <Button type="button" variant="outline" onClick={() => submit(true)}>
              Skip for now
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
