"use client";

import Link from "next/link";
import { ArrowRight, Barbell, BookOpenText, Fire, Stack } from "@phosphor-icons/react";
import type { CourseIndex } from "@/content/course";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { useCourseStats } from "@/lib/course-stats";
import { dueIds } from "@/lib/practice/srs";
import { useStore } from "@/lib/store";
import Bar from "./Bar";
import ProgressRing from "./ProgressRing";

/** Home page progress: ring, streak, continue card and unit overview. */
export default function Dashboard({
  lang,
  index,
  t,
}: {
  lang: Locale;
  index: CourseIndex;
  t: Dictionary["home"];
}) {
  const stats = useCourseStats(index);
  const total = index.lessons.length;
  const percent = Math.round((stats.slidesSeen / stats.totalSlides) * 100);
  const current = stats.current;
  const resume = current ? stats.resumeSlide(current) : null;
  const step = current ? stats.stepOf(current) : null;
  const byId = new Map(index.lessons.map((l) => [l.id, l]));
  const cards = useStore((s) => s.cards);
  // Due dates depend on the visitor's clock, so count only in the browser.
  const due = stats.hydrated ? dueIds(cards).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="continue-title"
        className="rounded-3xl border border-border bg-surface p-5 md:p-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ProgressRing
            percent={percent}
            label={`${t.progressLabel}: ${formatNumber(percent, lang)}%`}
          >
            <span className="text-2xl font-bold">{formatNumber(percent, lang)}%</span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <h2 id="continue-title" className="text-sm text-accent">
              {current ? (stats.started ? t.continueTitle : t.startTitle) : t.allDone}
            </h2>
            {current && resume && (
              <>
                <p className="mb-1 text-2xl font-bold">{current.title}</p>
                <p className="mb-4 text-sm text-muted">
                  {index.units.find((u) => u.id === current.unitId)?.title}
                </p>
                <Link
                  href={stats.resumeHref(lang, current)}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-ink transition-opacity hover:opacity-90"
                >
                  {current.format === "text"
                    ? step && step.step > 0
                      ? fill(t.continueStep, lang, { k: step.step + 1, total: step.steps })
                      : t.startLesson
                    : stats.started && resume > current.from
                      ? fill(t.continueAt, lang, { k: resume - current.from + 1, total: current.total })
                      : t.startLesson}
                  <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
          <div>
            <dt className="mb-1 flex items-center justify-center gap-1 text-xs text-muted">
              <BookOpenText size={16} aria-hidden />
              {t.lessons}
            </dt>
            <dd className="font-semibold">
              {formatNumber(stats.lessonsDone, lang)} / {formatNumber(total, lang)}
            </dd>
          </div>
          <div>
            <dt className="mb-1 flex items-center justify-center gap-1 text-xs text-muted">
              <Fire size={16} aria-hidden />
              {t.streak}
            </dt>
            <dd className="font-semibold">{formatNumber(stats.streak, lang)}</dd>
          </div>
          <div>
            <dt className="mb-1 flex items-center justify-center gap-1 text-xs text-muted">
              <Stack size={16} aria-hidden />
              {t.slidesSeen}
            </dt>
            <dd className="font-semibold">
              {formatNumber(stats.slidesSeen, lang)} / {formatNumber(stats.totalSlides, lang)}
            </dd>
          </div>
        </dl>
      </section>

      <Link
        href={due > 0 ? `/${lang}/practice/review/today/` : `/${lang}/practice/`}
        className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent"
      >
        <Barbell size={30} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t.dueTitle}</span>
          <span className="block text-sm text-muted">
            {due > 0 ? fill(t.dueBody, lang, { n: due }) : t.dueNone}
          </span>
        </span>
        <ArrowRight size={20} className="shrink-0 text-muted rtl:rotate-180" aria-hidden />
      </Link>

      <section aria-labelledby="units-title">
        <h2 id="units-title" className="mb-4 text-xl font-semibold">
          {t.unitsTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {index.units.map((u) => {
            const lessons = u.lessonIds.map((id) => byId.get(id)!);
            const done = lessons.filter(stats.isDone).length;
            const p = Math.round(
              lessons.reduce((s, l) => s + stats.percentOf(l), 0) / lessons.length,
            );
            return (
              <li key={u.id}>
                <Link
                  href={`/${lang}/course/#${u.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent"
                >
                  <p className="mb-2 font-semibold">{u.title}</p>
                  <Bar percent={p} label={u.title} className="mb-2" />
                  <p className="text-sm text-muted">
                    {fill(t.unitLessons, lang, { done, total: lessons.length })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
