import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That route is not part of CampusFlow.</p>
      <Link href="/dashboard" className="mt-4 inline-flex text-sm text-primary">
        Back to the dashboard
      </Link>
    </div>
  );
}
