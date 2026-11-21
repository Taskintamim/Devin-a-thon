"use client";

import { FormField } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { GOAL_CATEGORY_LABEL, GOAL_STATUS_LABEL } from "@/lib/labels";
import { fieldErrors, goalSchema, type GoalInput } from "@/lib/validation";
import type { CareerGoal } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: CareerGoal | null;
  today: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <GoalForm key={goal?.id ?? "new"} goal={goal} today={today} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function GoalForm({
  goal,
  today,
  onOpenChange,
}: {
  goal: CareerGoal | null;
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { addGoal, updateGoal } = useCampus();
  const [form, setForm] = useState({
    title: goal?.title ?? "",
    category: (goal?.category ?? "skill") as GoalInput["category"],
    status: (goal?.status ?? "not_started") as GoalInput["status"],
    targetDate: goal?.targetDate ?? today,
    notes: goal?.notes ?? "",
    progress: String(goal?.progress ?? 0),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = goalSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      if (goal) await updateGoal(goal.id, parsed.data);
      else await addGoal(parsed.data);
      toast.success(goal ? "Goal updated" : "Goal added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the goal");
    }
  }

  return (
    <DialogContent title={goal ? "Edit goal" : "New career goal"}>
        <form className="grid gap-3" onSubmit={submit}>
          <FormField label="Title" error={errors.title}>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Category" error={errors.category}>
              <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as GoalInput["category"] })}>
                {Object.entries(GOAL_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" error={errors.status}>
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as GoalInput["status"] })}>
                {Object.entries(GOAL_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Target date" error={errors.targetDate}>
              <Input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
            </FormField>
            <FormField label="Progress %" error={errors.progress}>
              <Input type="number" min={0} max={100} value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} />
            </FormField>
          </div>
          <FormField label="Notes" error={errors.notes}>
            <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
  );
}
