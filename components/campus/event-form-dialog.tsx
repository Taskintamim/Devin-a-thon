"use client";

import { FormField } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useCampus } from "@/hooks/use-campus";
import { EVENT_CATEGORY_LABEL, EVENT_STATUS_LABEL } from "@/lib/labels";
import { eventSchema, fieldErrors, type EventInput } from "@/lib/validation";
import type { CampusEvent } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CampusEvent | null;
  today: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <EventForm key={event?.id ?? "new"} event={event} today={today} onOpenChange={onOpenChange} /> : null}
    </Dialog>
  );
}

function EventForm({
  event,
  today,
  onOpenChange,
}: {
  event: CampusEvent | null;
  today: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { addEvent, updateEvent } = useCampus();
  const [form, setForm] = useState({
    title: event?.title ?? "",
    category: (event?.category ?? "club") as EventInput["category"],
    date: event?.date ?? today,
    startTime: event?.startTime ?? "16:00",
    endTime: event?.endTime ?? "17:30",
    location: event?.location ?? "",
    description: event?.description ?? "",
    status: (event?.status ?? "upcoming") as EventInput["status"],
    organization: event?.organization ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    try {
      if (event) await updateEvent(event.id, parsed.data);
      else await addEvent(parsed.data);
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the event");
    }
  }

  return (
    <DialogContent title={event ? "Edit event" : "New event"}>
        <form className="grid gap-3" onSubmit={submit}>
          <FormField label="Title" htmlFor="event-title" error={errors.title}>
            <Input id="event-title" value={form.title} onChange={(input) => setForm({ ...form, title: input.target.value })} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Category" error={errors.category}>
              <Select value={form.category} onChange={(input) => setForm({ ...form, category: input.target.value as EventInput["category"] })}>
                {Object.entries(EVENT_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" error={errors.status}>
              <Select value={form.status} onChange={(input) => setForm({ ...form, status: input.target.value as EventInput["status"] })}>
                {Object.entries(EVENT_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date" error={errors.date}>
              <Input type="date" value={form.date} onChange={(input) => setForm({ ...form, date: input.target.value })} />
            </FormField>
            <FormField label="Organization" error={errors.organization}>
              <Input value={form.organization} onChange={(input) => setForm({ ...form, organization: input.target.value })} />
            </FormField>
            <FormField label="Start" error={errors.startTime}>
              <Input type="time" value={form.startTime} onChange={(input) => setForm({ ...form, startTime: input.target.value })} />
            </FormField>
            <FormField label="End" error={errors.endTime}>
              <Input type="time" value={form.endTime} onChange={(input) => setForm({ ...form, endTime: input.target.value })} />
            </FormField>
          </div>
          <FormField label="Location" error={errors.location}>
            <Input value={form.location} onChange={(input) => setForm({ ...form, location: input.target.value })} />
          </FormField>
          <FormField label="Description" error={errors.description}>
            <Textarea value={form.description} onChange={(input) => setForm({ ...form, description: input.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{event ? "Save changes" : "Create event"}</Button>
          </div>
        </form>
      </DialogContent>
  );
}
