"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/base-path";
import type { PracticeData } from "./types";

let cache: Promise<PracticeData> | null = null;

function load() {
  cache ??= fetch(asset("/data/practice.json")).then((r) => {
    if (!r.ok) throw new Error(`practice data: ${r.status}`);
    return r.json() as Promise<PracticeData>;
  });
  cache.catch(() => {
    cache = null; // allow a retry on the next visit
  });
  return cache;
}

/** The course word bank, fetched once per visit. */
export function usePracticeData() {
  const [state, setState] = useState<{ data: PracticeData | null; error: boolean }>({
    data: null,
    error: false,
  });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data, error: false }),
      () => live && setState({ data: null, error: true }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
