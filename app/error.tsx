"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">CampusFlow</p>
      <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message || "The page could not be rendered."}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
        Try again
      </button>
    </div>
  );
}
