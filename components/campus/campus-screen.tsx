"use client";

import { EventFormDialog } from "@/components/campus/event-form-dialog";
import { ResponsibilityFormDialog } from "@/components/campus/responsibility-form-dialog";
import { Badge, EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useCampus } from "@/hooks/use-campus";
import { useRouteQuery } from "@/hooks/use-route-query";
import { daysInMonth, formatDateKey, formatLongDate, formatMonthLabel, shiftMonth, weekdayIndex } from "@/lib/dates";
import { EVENT_CATEGORY_LABEL, EVENT_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CampusEvent, ClubResponsibility, EventStatus } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function CampusScreen() {
  const { data, updateEvent, deleteEvent, deleteResponsibility } = useCampus();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [editing, setEditing] = useState<CampusEvent | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [role, setRole] = useState<ClubResponsibility | null>(null);
  const [pendingEvent, setPendingEvent] = useState<CampusEvent | null>(null);
  const [pendingRole, setPendingRole] = useState<ClubResponsibility | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  useRouteQuery("/campus", setQuery, () => {
    setEditing(null);
    setEventOpen(true);
  });
  if (!data) return null;
  const today = formatDateKey(now, data.profile.timezone);
  const visibleMonth = month ?? today.slice(0, 7);
  const q = query.trim().toLowerCase();
  const events = data.events
    .filter((event) => !selected || event.date === selected)
    .filter((event) => !q || `${event.title} ${event.organization} ${event.location}`.toLowerCase().includes(q))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const upcoming = data.events
    .filter((event) => event.date >= today && event.status !== "cancelled" && event.status !== "completed")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 4);
  const markers: Record<string, number> = {};
  for (const event of data.events) {
    if (event.date.startsWith(visibleMonth)) markers[event.date] = (markers[event.date] ?? 0) + 1;
  }

  return (
    <div className="cf-stagger space-y-5">
      <PageHeader
        eyebrow="Campus life"
        title="Events and clubs"
        description="Keep workshops, fairs, and club duties next to coursework."
        actions={<Button onClick={() => { setEditing(null); setEventOpen(true); }}><Plus className="size-4" /> New event</Button>}
      />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming events.</p> : null}
        {upcoming.map((event) => (
          <article key={event.id} className="cf-interactive cf-lift rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-primary">{formatLongDate(event.date)}</p>
            <h2 className="mt-1 text-sm font-semibold">{event.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{event.startTime}–{event.endTime} · {event.location}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <MonthGrid month={visibleMonth} today={today} selected={selected} markers={markers} onShift={(delta) => setMonth(shiftMonth(visibleMonth, delta))} onSelect={(date) => setSelected(selected === date ? null : date)} />
        <div className="space-y-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events" aria-label="Search events" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {selected ? <button type="button" className="text-xs text-primary" onClick={() => setSelected(null)}>Clear {selected}</button> : null}
          {events.length === 0 ? <EmptyState title="No events" body="Create an event or pick another day." action={<Button onClick={() => setEventOpen(true)}>Create event</Button>} /> : events.map((event) => (
            <article key={event.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{event.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{formatLongDate(event.date)} · {event.startTime}–{event.endTime} · {event.location}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.organization}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge>{EVENT_CATEGORY_LABEL[event.category]}</Badge>
                  <Badge tone={event.status === "attending" ? "ok" : event.status === "cancelled" ? "critical" : "info"}>{EVENT_STATUS_LABEL[event.status]}</Badge>
                </div>
              </div>
              {event.description ? <p className="mt-2 text-sm text-muted-foreground">{event.description}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["upcoming", "attending", "completed", "cancelled"] as EventStatus[]).map((status) => (
                  <Button key={status} size="sm" variant={event.status === status ? "secondary" : "ghost"} onClick={() => {
                    void updateEvent(event.id, { ...event, status }).then(() => toast.success(`Marked ${EVENT_STATUS_LABEL[status].toLowerCase()}`)).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update the event"));
                  }}>
                    {EVENT_STATUS_LABEL[status]}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(event); setEventOpen(true); }}><Pencil className="size-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingEvent(event)}><Trash2 className="size-3.5" /> Delete</Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Club responsibilities</h2>
          <Button size="sm" variant="outline" onClick={() => { setRole(null); setRoleOpen(true); }}>Add responsibility</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {data.responsibilities.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-primary">{item.organization}</p>
              <h3 className="mt-1 text-sm font-semibold">{item.role}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.commitment}</p>
              <p className="mt-2 text-sm">Next: {item.nextAction}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setRole(item); setRoleOpen(true); }}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingRole(item)}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EventFormDialog open={eventOpen} onOpenChange={setEventOpen} event={editing} today={today} />
      <ResponsibilityFormDialog open={roleOpen} onOpenChange={setRoleOpen} item={role} />
      <ConfirmDialog open={Boolean(pendingEvent)} onOpenChange={(next) => { if (!next) setPendingEvent(null); }} title="Delete event" body={pendingEvent ? `Delete “${pendingEvent.title}”?` : ""} confirmLabel="Delete" onConfirm={() => { if (!pendingEvent) return; const target = pendingEvent; setPendingEvent(null); void deleteEvent(target.id).then(() => toast.success("Event deleted")).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not delete the event")); }} />
      <ConfirmDialog open={Boolean(pendingRole)} onOpenChange={(next) => { if (!next) setPendingRole(null); }} title="Delete responsibility" body={pendingRole ? `Remove the ${pendingRole.role} role at ${pendingRole.organization}?` : ""} confirmLabel="Delete" onConfirm={() => { if (!pendingRole) return; deleteResponsibility(pendingRole.id); toast.success("Responsibility deleted"); }} />
    </div>
  );
}

function MonthGrid({
  month,
  today,
  selected,
  markers,
  onShift,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string | null;
  markers: Record<string, number>;
  onShift: (delta: number) => void;
  onSelect: (date: string) => void;
}) {
  const count = daysInMonth(month);
  const lead = weekdayIndex(`${month}-01`);
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => onShift(-1)}>Prev</Button>
        <p className="text-sm font-medium">{formatMonthLabel(month)}</p>
        <Button size="sm" variant="ghost" onClick={() => onShift(1)}>Next</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, index) => date ? (
          <button key={date} type="button" onClick={() => onSelect(date)} className={cn("h-9 rounded-md text-xs", selected === date && "bg-primary text-primary-foreground", selected !== date && date === today && "border border-primary", selected !== date && date !== today && "hover:bg-secondary")}>
            {Number(date.slice(8))}
            {markers[date] ? <span className="block text-[9px] leading-none">{markers[date]}</span> : null}
          </button>
        ) : <span key={`empty-${index}`} />)}
      </div>
    </div>
  );
}
