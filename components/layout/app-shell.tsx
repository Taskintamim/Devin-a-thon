"use client";

import { NAV_ITEMS, NAV_SECTIONS, labelForPath } from "@/components/layout/nav";
import { useCampus } from "@/hooks/use-campus";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, CalendarRange, ChevronRight, ListTodo, Menu, Moon, Plus, Search, Sun, X } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Onboarding } from "@/components/layout/onboarding";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, data } = useCampus();
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const mobileOpen = menuPath === pathname;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteQuery("");
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-3 px-6">
          <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
          <div className="h-8 w-56 animate-pulse rounded bg-secondary" />
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>
    );
  }

  if (!data.profile.onboardingComplete) return <Onboarding />;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <Brand />
        <Nav pathname={pathname} />
        <ProfileFoot name={data.profile.name} university={data.profile.university} mode={data.mode} />
      </aside>
      <div className="relative z-10 md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-xl md:px-6">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-secondary md:hidden"
            aria-label="Open navigation"
            onClick={() => setMenuPath(pathname)}
          >
            <Menu className="size-4" />
          </button>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm md:flex">
            <span className="text-muted-foreground">CampusFlow</span>
            <ChevronRight className="size-3.5 text-muted-foreground/60" />
            <span className="font-medium">{labelForPath(pathname)}</span>
          </nav>
          <button
            type="button"
            onClick={() => {
              setPaletteQuery("");
              setPaletteOpen(true);
            }}
            className="ml-auto flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary md:w-64"
          >
            <Search className="size-4" />
            <span className="hidden flex-1 md:inline">Search workspace</span>
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
          </button>
          <QuickCreate />
          <Link
            href="/settings"
            className="hidden max-w-[11rem] items-center gap-2 rounded-md border border-border px-2.5 py-1 text-left sm:flex"
            title={`${data.profile.name || "Student"} · ${data.profile.university || "University"}`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
              {(data.profile.name || "S")
                .split(" ")
                .map((part) => part[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium leading-tight">{data.profile.name || "Student"}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{data.profile.university || "University"}</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>
        <main key={pathname} className="cf-fade mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <MobileNav open={mobileOpen} onOpenChange={(open) => setMenuPath(open ? pathname : null)} pathname={pathname} name={data.profile.name} university={data.profile.university} mode={data.mode} />
      <CommandPalette open={paletteOpen} query={paletteQuery} onQueryChange={setPaletteQuery} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-3.5">
      <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
        CF
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">CampusFlow OS</span>
        <span className="block text-[11px] text-muted-foreground">Student workspace</span>
      </span>
    </Link>
  );
}

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2" aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{section.title}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-auto">
        <SettingsLink pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function SettingsLink({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const settings = NAV_ITEMS[NAV_ITEMS.length - 1];
  const active = pathname === settings.href;
  const Icon = settings.icon;
  return (
    <Link
      href={settings.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {settings.label}
    </Link>
  );
}

function ProfileFoot({ name, university, mode }: { name: string; university: string; mode: "demo" | "notion" }) {
  const initials = (name || "Student")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="border-t border-border p-3">
      <Link href="/settings" className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary">
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{initials || "S"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name || "Student"}</span>
          <span className="block truncate text-xs text-muted-foreground">{university || "Local workspace"}</span>
        </span>
        <span className={cn("size-2 rounded-full", mode === "notion" ? "bg-[var(--success)]" : "bg-muted-foreground")} title={mode === "notion" ? "Notion connected" : "Local workspace"} />
      </Link>
    </div>
  );
}

function QuickCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const items = [
    { label: "New task", href: "/tasks?new=1", icon: ListTodo },
    { label: "New course", href: "/courses?new=1", icon: BookOpen },
    { label: "New event", href: "/campus?new=1", icon: CalendarRange },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Quick create"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">Create</span>
      </button>
      {open ? (
        <div className="cf-pop absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-[var(--shadow-pop)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-secondary"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  router.push(item.href);
                }}
              >
                <Icon className="size-4 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const { data, setThemePreference } = useCampus();
  const { setTheme } = useTheme();
  const dark = data?.profile.theme !== "light";
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"
      onClick={() => {
        const next = dark ? "light" : "dark";
        setTheme(next);
        setThemePreference(next);
      }}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function MobileNav({
  open,
  onOpenChange,
  pathname,
  name,
  university,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  name: string;
  university: string;
  mode: "demo" | "notion";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cf-fade fixed inset-0 z-40 bg-slate-950/60 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar outline-none md:hidden">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">Primary pages</Dialog.Description>
          <div className="flex items-center justify-between">
            <Brand />
            <Dialog.Close className="mr-3 rounded-md p-1 text-muted-foreground" aria-label="Close navigation">
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Nav pathname={pathname} onNavigate={() => onOpenChange(false)} />
          <ProfileFoot name={name} university={university} mode={mode} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommandPalette({
  open,
  query,
  onQueryChange,
  onOpenChange,
}: {
  open: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useCampus();
  const router = useRouter();

  const results = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const pages = NAV_ITEMS.filter((item) => !q || item.label.toLowerCase().includes(q)).map((item) => ({
      id: item.href,
      label: item.label,
      hint: "Page",
      href: item.href,
    }));
    const tasks = data.tasks
      .filter((task) => !q || task.title.toLowerCase().includes(q))
      .slice(0, 6)
      .map((task) => ({ id: task.id, label: task.title, hint: "Task", href: `/tasks?q=${encodeURIComponent(task.title)}` }));
    const courses = data.courses
      .filter((course) => !q || `${course.code} ${course.name}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((course) => ({ id: course.id, label: `${course.code} ${course.name}`, hint: "Course", href: `/courses?q=${encodeURIComponent(course.code)}` }));
    const events = data.events
      .filter((event) => !q || event.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((event) => ({ id: event.id, label: event.title, hint: "Event", href: `/campus?q=${encodeURIComponent(event.title)}` }));
    const goals = data.goals
      .filter((goal) => !q || goal.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((goal) => ({ id: goal.id, label: goal.title, hint: "Career", href: `/career?q=${encodeURIComponent(goal.title)}` }));
    return [...pages, ...tasks, ...courses, ...events, ...goals].slice(0, 12);
  }, [data, query]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cf-fade fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px]" />
        <Dialog.Content className="cf-pop fixed left-1/2 top-[15%] z-50 w-[min(calc(100%-1.5rem),540px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-pop)] outline-none">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages and records</Dialog.Description>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search pages, tasks, courses, events"
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li> : null}
            {results.map((result) => (
              <li key={`${result.hint}-${result.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  onClick={() => {
                    router.push(result.href);
                    onOpenChange(false);
                  }}
                >
                  <span className="truncate">{result.label}</span>
                  <span className="ml-3 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{result.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
