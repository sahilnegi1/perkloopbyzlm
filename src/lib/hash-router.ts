"use client";

import { useEffect, useState, useCallback } from "react";

export type Route = {
  /** path segments, e.g. "#/app/business/123" → ["app","business","123"] */
  segments: string[];
  /** query params after ?, e.g. #/auth?role=merchant */
  query: URLSearchParams;
  /** full hash without leading # */
  raw: string;
};

function parseHash(): Route {
  const raw = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  return {
    segments,
    query: new URLSearchParams(queryPart ?? ""),
    raw,
  };
}

export function navigate(to: string, opts?: { replace?: boolean }) {
  const target = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
  if (opts?.replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
}

/** Minimal hash router — the whole SPA lives under `/` (sandbox constraint). */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { segments: [], query: new URLSearchParams(), raw: "" }
      : parseHash()
  );

  const onChange = useCallback(() => setRoute(parseHash()), []);

  useEffect(() => {
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [onChange]);

  return route;
}
