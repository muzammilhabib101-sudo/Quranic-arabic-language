"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { normalize } from "@/lib/arabic";
import { asset } from "@/lib/base-path";

type SubResult = { title: string; url: string; excerpt: string };
type Result = { url: string; meta: { title?: string }; excerpt: string; sub_results?: SubResult[] };
type Pagefind = {
  options: (o: Record<string, unknown>) => Promise<void>;
  search: (q: string) => Promise<{ results: { data: () => Promise<Result> }[] }>;
};

let pagefind: Promise<Pagefind> | null = null;

/** Loads Pagefind's runtime, written to /pagefind/ by the postbuild step. */
function loadPagefind() {
  // Built after Next.js, so it must not go through the bundler.
  const load = new Function("p", "return import(p)") as (p: string) => Promise<Pagefind>;
  pagefind ??= load(asset("/pagefind/pagefind.js")).then(async (pf) => {
    // Result URLs stay root-relative ("/en/words/"); next/link adds the base path.
    await pf.options({ excerptLength: 24, baseUrl: "/" });
    return pf;
  });
  pagefind.catch(() => (pagefind = null));
  return pagefind;
}

export default function SearchView({ lang, t }: { lang: Locale; t: Dictionary["search"] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const latest = useRef("");

  useEffect(() => {
    const q = query.trim();
    latest.current = q;
    if (!q) return;
    const timer = setTimeout(async () => {
      try {
        const pf = await loadPagefind();
        // Search both as typed and with harakat removed; the index holds both forms.
        const folded = normalize(q);
        const found = await pf.search(folded || q);
        const data = await Promise.all(found.results.slice(0, 20).map((r) => r.data()));
        if (latest.current === q) setResults(data);
      } catch {
        setUnavailable(true);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const shown = query.trim() ? results : null;

  return (
    <div className="flex flex-col gap-5">
      <label className="relative">
        <span className="sr-only">{t.label}</span>
        <MagnifyingGlass size={22} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.placeholder}
          dir="auto"
          className="min-h-14 w-full rounded-2xl border border-border bg-surface ps-12 pe-4 text-lg focus:border-accent"
        />
      </label>
      <p className="text-sm text-muted">{t.hint}</p>

      {unavailable && <p className="rounded-2xl border border-dashed border-border bg-surface p-5 text-muted">{t.unavailable}</p>}

      {shown && (
        <p className="text-sm text-muted" aria-live="polite">
          {shown.length ? fill(t.results, lang, { n: shown.length }) : fill(t.none, lang, { q: query.trim() })}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {shown?.map((r) => (
          <li key={r.url} className="rounded-2xl border border-border bg-surface p-4">
            <Link href={r.url} className="text-lg font-semibold hover:text-accent">
              {r.meta.title ?? r.url}
            </Link>
            {/* Excerpts come from our own pages; Pagefind marks the match with <mark>. */}
            <p className="mt-1 text-sm text-muted [&_mark]:rounded [&_mark]:bg-accent/30 [&_mark]:text-text" dangerouslySetInnerHTML={{ __html: r.excerpt }} />
            {r.sub_results && r.sub_results.length > 1 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.sub_results.slice(0, 6).map((s) => (
                  <li key={s.url}>
                    <Link href={s.url} className="inline-flex min-h-11 items-center rounded-lg bg-surface-2 px-3 text-sm hover:text-accent">
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
