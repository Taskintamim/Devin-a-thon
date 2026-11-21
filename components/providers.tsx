"use client";

import { AppShell } from "@/components/layout/app-shell";
import { CampusProvider, useCampus } from "@/hooks/use-campus";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "sonner";

function ThemeSync() {
  const { data } = useCampus();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (data?.profile.theme) setTheme(data.profile.theme);
  }, [data?.profile.theme, setTheme]);

  return null;
}

function ToastHost() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "light" ? "light" : "dark"} position="top-right" closeButton />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProviderBridge>
      <CampusProvider>
        <ThemeSync />
        <AppShell>{children}</AppShell>
        <ToastHost />
      </CampusProvider>
    </ThemeProviderBridge>
  );
}

function ThemeProviderBridge({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="campusflow-theme" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
