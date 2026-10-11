import { useSyncExternalStore } from "react";

export type Route = { page: "home" } | { page: "match"; code: string };

const MATCH_PATH = /^\/m\/([^/]+)\/?$/;

export function parseRoute(pathname: string): Route {
  const match = MATCH_PATH.exec(pathname);
  return match
    ? { page: "match", code: decodeURIComponent(match[1]!).toUpperCase() }
    : { page: "home" };
}

export function matchPath(code: string): string {
  return `/m/${code}`;
}

const NAVIGATE_EVENT = "sl:navigate";

/** Adds a history entry, so Back returns to the previous screen. */
export function navigate(path: string): void {
  if (path === window.location.pathname) return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

function currentPath(): string {
  return window.location.pathname;
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, currentPath);
  return parseRoute(pathname);
}
