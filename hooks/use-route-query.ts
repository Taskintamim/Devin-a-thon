"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useRouteQuery(pathname: string, onQuery: (query: string) => void, onCreate: () => void) {
  const params = useSearchParams();
  const router = useRouter();
  const signature = params.toString();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!signature || handled.current === signature) return;
    const query = params.get("q");
    const create = params.get("new");
    if (!query && create !== "1") return;
    handled.current = signature;
    if (query) onQuery(query);
    if (create === "1") onCreate();
    router.replace(pathname, { scroll: false });
  }, [signature, params, pathname, router, onQuery, onCreate]);
}
