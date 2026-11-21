import { cn } from "@/lib/utils";
import type { Priority, TaskStatus } from "@/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { LucideIcon } from "lucide-react";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}

export function AnimatedCard({
  className,
  interactive = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)]",
        interactive && "cf-interactive",
        className,
      )}
      {...props}
    />
  );
}

const tones = {
  neutral: "bg-secondary text-secondary-foreground",
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  violet: "bg-primary/12 text-primary",
  teal: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={priority}>
      <span className={cn("mr-1 size-1.5 rounded-full", dotForPriority(priority))} />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function dotForPriority(priority: Priority): string {
  return priority === "critical"
    ? "bg-rose-500"
    : priority === "high"
      ? "bg-orange-500"
      : priority === "medium"
        ? "bg-amber-500"
        : "bg-slate-400";
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const tone = status === "completed" ? "ok" : status === "in_progress" ? "info" : "neutral";
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <h1 className="mt-1.5 text-[1.7rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {Icon ? (
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const statAccents = {
  violet: { ring: "bg-indigo-500/15 text-indigo-500", bar: "bg-indigo-500" },
  teal: { ring: "bg-emerald-500/15 text-emerald-500", bar: "bg-emerald-500" },
  danger: { ring: "bg-rose-500/15 text-rose-500", bar: "bg-rose-500" },
  warning: { ring: "bg-amber-500/15 text-amber-500", bar: "bg-amber-500" },
  success: { ring: "bg-emerald-500/15 text-emerald-500", bar: "bg-emerald-500" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
  progress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: keyof typeof statAccents;
  progress?: number;
}) {
  const style = statAccents[accent];
  return (
    <div className="cf-interactive cf-lift group rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", style.ring)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="cf-tnum mt-2 text-[1.75rem] font-semibold leading-none">{value}</p>
      {hint ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      {typeof progress === "number" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className={cn("h-full rounded-full transition-[width] duration-500", style.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-secondary/70" />
      ))}
    </div>
  );
}

export function ScreenFallback() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-secondary" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}
