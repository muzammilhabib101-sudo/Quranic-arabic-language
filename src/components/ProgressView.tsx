"use client";

import Link from "next/link";
import { ArrowRight, ClockCounterClockwise } from "@phosphor-icons/react";
import type { CourseIndex } from "@/content/course";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { useCourseStats } from "@/lib/course-stats";
import { daysUntil } from "@/lib/practice/srs";
import { today, useStore } from "@/lib/store";
import Bar from "./Bar";

/** Monday-to-Sunday dates of the current week. */
function thisWeek(now = new Date()) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function ProgressView({
  lang,
  index,
  t,
}: {
  lang: Locale;
  index: CourseIndex;
  t: Dictionary["progress"];
}) {
  const stats = useCourseStats(index);
  const byId = new Map(index.lessons.map((l) => [l.id, l]));
  const active = new Set(stats.activeDays);
  const dayName = new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en", {
    weekday: "short",
  });
  const fullDate = new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en", {
    dateStyle: "full",
  });

  const cards = useStore((s) => s.cards);
  const practiceStats = useStore((s) => s.practice);
  const practice = stats.hydrated ? practiceStats : { answered: 0, correct: 0, units: {} as typeof practiceStats.units };
  const cardList = stats.hydrated ? Object.values(cards) : [];
  const cardCount = cardList.length;
  // Today, tomorrow, 2–7 days, later.
  const queue = [0, 0, 0, 0];
  for (const c of cardList) {
    const d = daysUntil(c.due);
    queue[d === 0 ? 0 : d === 1 ? 1 : d <= 7 ? 2 : 3]++;
  }
  const accuracy = practice.answered ? Math.round((practice.correct / practice.answered) * 100) : null;

  const tiles = [
    { label: t.lessonsDone, value: `${formatNumber(stats.lessonsDone, lang)} / ${formatNumber(index.lessons.length, lang)}` },
    { label: t.slidesSeen, value: `${formatNumber(stats.slidesSeen, lang)} / ${formatNumber(stats.totalSlides, lang)}` },
    { label: t.streak, value: formatNumber(stats.streak, lang) },
    { label: t.activeDays, value: formatNumber(stats.activeDays.length, lang) },
    { label: t.accuracy, value: accuracy === null ? "—" : `${formatNumber(accuracy, lang)}%` },
  ];

  return (
    <div className="flex flex-col gap-6">
      {stats.hydrated && !stats.started && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface p-5">
          <p className="text-muted">{t.empty}</p>
          <Link
            href={`/${lang}/slides/1/`}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90"
          >
            {t.startCta}
            <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-surface p-4">
            <dt className="mb-1 text-sm text-muted">{tile.label}</dt>
            <dd className="text-2xl font-bold">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="week-title" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="week-title" className="mb-4 font-semibold">
          {t.week}
        </h2>
        {/* Dates depend on the visitor's clock, so the week renders only in the browser. */}
        <ol className="grid min-h-[3.75rem] grid-cols-7 gap-2 text-center">
          {(stats.hydrated ? thisWeek() : []).map((d) => {
            const key = today(d);
            const on = active.has(key);
            const isToday = key === today();
            return (
              <li key={key} aria-label={`${fullDate.format(d)}${on ? " ✓" : ""}`}>
                <span className="mb-1 block text-xs text-muted" aria-hidden>
                  {dayName.format(d)}
                </span>
                <span
                  aria-hidden
                  className={`mx-auto grid size-9 place-items-center rounded-full text-sm ${
                    on ? "bg-accent-2 font-semibold text-bg" : "bg-surface-2 text-muted"
                  } ${isToday ? "ring-2 ring-accent" : ""}`}
                >
                  {formatNumber(d.getDate(), lang)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="units-title" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="units-title" className="mb-4 font-semibold">
          {t.byUnit}
        </h2>
        <ul className="flex flex-col gap-4">
          {index.units.map((u) => {
            const lessons = u.lessonIds.map((id) => byId.get(id)!);
            const done = lessons.filter(stats.isDone).length;
            const p = Math.round(
              lessons.reduce((s, l) => s + stats.percentOf(l), 0) / lessons.length,
            );
            return (
              <li key={u.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <Link href={`/${lang}/course/#${u.id}`} className="inline-flex min-h-11 items-center font-medium hover:text-accent">
                    {u.title}
                  </Link>
                  <span className="shrink-0 text-sm text-muted">
                    {fill(t.unitLessons, lang, { done, total: lessons.length })}
                  </span>
                </div>
                <Bar percent={p} label={u.title} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="queue-title" className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="queue-title" className="flex items-center gap-2 font-semibold">
            <ClockCounterClockwise size={22} className="text-accent" aria-hidden />
            {t.reviewQueue}
          </h2>
          {queue[0] > 0 && (
            <Link
              href={`/${lang}/practice/review/today/`}
              className="min-h-11 content-center rounded-xl bg-accent px-4 font-semibold text-accent-ink hover:opacity-90"
            >
              {t.reviewNow}
            </Link>
          )}
        </div>
        {cardCount === 0 ? (
          <p className="text-sm text-muted">{t.queueEmpty}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[t.dueToday, t.dueTomorrow, fill(t.dueIn, lang, { n: "2–7" }), t.later].map((label, i) => (
              <div key={label} className={`rounded-xl p-3 ${i === 0 && queue[0] > 0 ? "bg-accent/15" : "bg-surface-2"}`}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="text-xl font-bold">{fill(t.words, lang, { n: queue[i] })}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="conf-title" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="conf-title" className="mb-4 font-semibold">
          {t.confidence}
        </h2>
        <ul className="flex flex-col gap-3">
          {index.units.map((u) => {
            const s = practice.units[u.id];
            const acc = s && s.answered ? Math.round((s.correct / s.answered) * 100) : null;
            const [label, style] =
              acc === null
                ? [t.notYet, "text-muted"]
                : acc >= 80
                  ? [t.strong, "text-accent-2"]
                  : acc >= 50
                    ? [t.getting, "text-accent"]
                    : [t.weak, "text-wrong"];
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <span>{u.title}</span>
                <span className={`text-sm ${style}`}>
                  {label}
                  {acc !== null && ` · ${formatNumber(acc, lang)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
