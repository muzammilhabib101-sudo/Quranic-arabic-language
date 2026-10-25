"use client";

import Link from "next/link";
import { useDeferredValue, useRef, useState } from "react";
import { MagnifyingGlass, SpeakerHigh } from "@phosphor-icons/react";
import type { DictRoot } from "@/content/dictionary";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { normalize } from "@/lib/arabic";
import { roleTag } from "./player/roles";

type Role = "noun" | "verb" | "particle";

export default function DictionaryView({
  lang,
  groups,
  patterns,
  t,
  roles,
}: {
  lang: Locale;
  groups: DictRoot[];
  patterns: { key: string; ar: string }[];
  t: Dictionary["words"];
  roles: Dictionary["home"]["roles"];
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [pattern, setPattern] = useState("");
  const deferred = useDeferredValue(query);
  const q = normalize(deferred);
  const audio = useRef<HTMLAudioElement | null>(null);

  function play(src: string) {
    audio.current?.pause();
    audio.current = new Audio(src);
    void audio.current.play();
  }

  const visible = groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) =>
          (!role || e.role === role) &&
          (!pattern || e.pattern?.key === pattern) &&
          (!q || e.search.includes(q)),
      ),
    }))
    .filter((g) => g.entries.length > 0);
  const count = visible.reduce((n, g) => n + g.entries.length, 0);

  const select = "min-h-11 rounded-xl border border-border bg-surface px-3";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t.search}</span>
          <MagnifyingGlass size={20} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            dir="auto"
            className="min-h-11 w-full rounded-xl border border-border bg-bg ps-10 pe-3 focus:border-accent"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="sr-only">{t.kind}</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role | "")} className={select}>
            <option value="">{t.allRoles}</option>
            {(["noun", "verb", "particle"] as const).map((r) => (
              <option key={r} value={r}>
                {roles[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="sr-only">{t.pattern}</span>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)} className={select}>
            <option value="">{t.allPatterns}</option>
            {patterns.map((p) => (
              <option key={p.key} value={p.key}>
                {p.ar}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {count ? fill(t.results, lang, { n: count }) : t.none}
      </p>

      {visible.map((g) => {
        const anchor = g.root ? `root-${g.root.replace(/ /g, "")}` : "no-root";
        return (
          <section key={anchor} aria-labelledby={anchor} className="rounded-2xl border border-border bg-surface">
            <h2 id={anchor} className="flex items-baseline gap-3 border-b border-border px-5 py-3">
              {g.root ? (
                <>
                  <span className="text-sm text-muted">{t.root}</span>
                  <span lang="ar" className="arabic text-3xl text-accent">
                    {g.root}
                  </span>
                </>
              ) : (
                <span className="font-semibold">{t.noRoot}</span>
              )}
            </h2>
            <ul>
              {g.entries.map((e) => (
                <li key={`${e.lemma}|${e.role}`} className="border-b border-border px-5 py-3 last:border-b-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span lang="ar" className="arabic text-2xl">
                      {e.lemma}
                    </span>
                    <span className={`rounded-full px-2 text-xs ${roleTag[e.role]}`}>{roles[e.role]}</span>
                    {e.pattern && (
                      <span className="rounded-full bg-surface-2 px-2 text-xs text-muted">
                        {t.pattern}: <span lang="ar" className="arabic text-sm text-text">{e.pattern.ar}</span>
                      </span>
                    )}
                    <span className="text-xs text-muted">{fill(t.count, lang, { n: e.count })}</span>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {e.forms.map((f) => {
                      const [s, a] = f.ref.split(":");
                      return (
                        <li key={f.ref} className="flex items-center gap-2 rounded-xl bg-surface-2 py-1 ps-3 pe-1">
                          <span lang="ar" className="quran text-2xl leading-[1.8]">
                            {f.ar}
                          </span>
                          <span className="text-sm" dir="auto">
                            {f.m[lang] || f.m.ur}
                          </span>
                          <Link
                            href={`/${lang}/lesson/${f.lesson}/`}
                            className="inline-flex min-h-11 items-center px-1 text-xs text-muted underline hover:text-accent"
                          >
                            {formatNumber(Number(s), lang)}:{formatNumber(Number(a), lang)}
                            <span className="sr-only"> — {t.inLesson}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => play(f.audio)}
                            aria-label={`${t.play} ${f.ar}`}
                            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface hover:text-accent"
                          >
                            <SpeakerHigh size={18} aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Bare-letter text so Pagefind finds words typed without harakat. */}
                  <span className="hidden">{e.search}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
