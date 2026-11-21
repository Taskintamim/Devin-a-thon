import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/planner", label: "Smart Planner", icon: CalendarDays },
      { href: "/tasks", label: "My Tasks", icon: CheckSquare },
      { href: "/courses", label: "Courses", icon: GraduationCap },
    ],
  },
  {
    title: "Campus",
    items: [{ href: "/campus", label: "Events & Activities", icon: Building2 }],
  },
  {
    title: "Growth",
    items: [{ href: "/career", label: "Career Development", icon: Briefcase }],
  },
  {
    title: "Intelligence",
    items: [{ href: "/assistant", label: "Student Assistant", icon: MessageCircle }],
  },
];

export const NAV_ITEMS: NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  { href: "/settings", label: "Settings", icon: Settings },
];

const LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/planner": "Smart Planner",
  "/tasks": "My Tasks",
  "/courses": "Courses",
  "/campus": "Events & Activities",
  "/career": "Career Development",
  "/assistant": "Student Assistant",
  "/settings": "Settings",
};

export function labelForPath(pathname: string): string {
  return LABELS[pathname] ?? "CampusFlow";
}
