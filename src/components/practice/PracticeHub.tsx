"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Cards,
  CheckCircle,
  ClockCounterClockwise,
  Ear,
  ListChecks,
  PuzzlePiece,
  Shapes,
  SquaresFour,
  Textbox,
  TextAa,
  TreeStructure,
  type Icon,
} from "@phosphor-icons/react";
import type { CourseIndex } from "@/content/course";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { daysUntil, dueIds } from "@/lib/practice/srs";
import { EXERCISE_TYPES, type ExerciseType } from "@/lib/practice/types";
import { useHydrated, useStore } from "@/lib/store";

const ICONS: Record<ExerciseType, Icon> = {
  meaning: TextAa,
  match: SquaresFour,
  pattern: Shapes,
  root: TreeStructure,
  anatomy: PuzzlePiece,
  role: ListChecks,
  fill: Textbox,
  translate: BookOpenText,
  listen: Ear,
  flashcard: Cards,
};

/** "today", "tomorrow" or "in N days" for a due date. */
export function whenLabel(due: string, lang: Locale, t: Dictionary["practice"]["when"]) {
  const d = daysUntil(due);
  return d === 0 ? t.today : d === 1 ? t.tomorrow : fill(t.days, lang, { n: d });
}

export default function PracticeHub({
  lang,
  index,
  t,
}: {
  lang: Locale;
  index: CourseIndex;
  t: Dictionary["practice"];
}) {
  const hydrated = useHydrated();
  const cards = useStore((s) => s.cards);
  const practised = useStore((s) => s.practice.lessons);
  const due = hydrated ? dueIds(cards).length : 0;
  const nextDue = hydrated
    ? Object.values(cards).map((c) => c.due).sort()[0]
    : undefined;
  const hasCards = hydrated && Object.keys(cards).length > 0;
  const byId = new Map(index.lessons.map((l) => [l.id, l]));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="today-title" className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-surface p-5 md:p-7">
        <ClockCounterClockwise size={40} className="shrink-0 text-accent-2" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="today-title" className="text-xl font-bold">
            {t.today}
          </h2>
          <p className="text-muted">
            {!hasCards
              ? t.noCards
              : due > 0
                ? due === 1
                  ? t.dueOne
                  : fill(t.dueCount, lang, { n: due })
                : `${t.dueNone} ${nextDue ? fill(t.nextDue, lang, { when: whenLabel(nextDue, lang, t.when) }) : ""}`}
          </p>
        </div>
        {due > 0 && (
          <Link
            href={`/${lang}/practice/review/today/`}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90"
          >
            {t.startReview}
            <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </section>

      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="mb-4 text-xl font-semibold">
          {t.modes}
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {EXERCISE_TYPES.map((type) => {
            const Icon = ICONS[type];
            return (
              <li key={type}>
                <Link
                  href={`/${lang}/practice/mode/${type}/`}
                  className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent"
                >
                  <Icon size={26} className="text-accent" aria-hidden />
                  <span className="font-semibold">{t.types[type].name}</span>
                  <span className="text-sm text-muted">{t.types[type].hint}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="lessons-title" className="flex flex-col gap-4">
        <h2 id="lessons-title" className="text-xl font-semibold">
          {t.byLesson}
        </h2>
        {index.units.map((u) => (
          <div key={u.id} className="rounded-2xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h3 className="font-semibold">{u.title}</h3>
                <p className="text-sm text-muted">{t.unitReviewHint}</p>
              </div>
              <Link
                href={`/${lang}/practice/unit/${u.id}/`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 hover:border-accent hover:text-accent"
              >
                {t.unitReview}
              </Link>
            </div>
            <ul className="flex flex-wrap gap-2 p-4">
              {u.lessonIds.map((id) => {
                const l = byId.get(id)!;
                const done = hydrated && !!practised[id];
                return (
                  <li key={id}>
                    <Link
                      href={`/${lang}/practice/lesson/${id}/`}
                      className={`inline-flex min-h-11 items-center gap-1 rounded-xl border px-3 text-sm ${
                        done ? "border-accent-2/50 text-accent-2" : "border-border hover:border-accent hover:text-accent"
                      }`}
                    >
                      {done && <CheckCircle size={16} weight="fill" aria-hidden />}
                      {/* The visible text starts the accessible name, so voice control can use it. */}
                      {u.lessonIds.length > 1 ? formatNumber(l.order, lang) : l.title}
                      <span className="sr-only">
                        {u.lessonIds.length > 1 && ` — ${l.title}`}
                        {done && ` — ${t.practised}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
