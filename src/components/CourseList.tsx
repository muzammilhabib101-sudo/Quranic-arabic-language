"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import type { CourseIndex } from "@/content/course";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { useCourseStats } from "@/lib/course-stats";
import Bar from "./Bar";

export default function CourseList({
  lang,
  index,
  t,
}: {
  lang: Locale;
  index: CourseIndex;
  t: Dictionary["course"];
}) {
  const stats = useCourseStats(index);
  const byId = new Map(index.lessons.map((l) => [l.id, l]));
  const current = stats.current;

  return (
    <div className="flex flex-col gap-8">
      {current && (
        <Link
          href={stats.resumeHref(lang, current)}
          className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-accent px-6 font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          {stats.started ? fill(t.continue, lang, { lesson: current.title }) : t.start}
          <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
        </Link>
      )}

      {index.units.map((unit) => {
        const lessons = unit.lessonIds.map((id) => byId.get(id)!);
        const minutes = lessons.reduce((sum, l) => sum + l.minutes, 0);
        const done = lessons.filter(stats.isDone).length;
        const percent = Math.round(
          lessons.reduce((sum, l) => sum + stats.percentOf(l), 0) / lessons.length,
        );

        return (
          <section
            key={unit.id}
            id={unit.id}
            aria-labelledby={`${unit.id}-title`}
            className="scroll-mt-20 rounded-2xl border border-border bg-surface"
          >
            <header className="border-b border-border p-5">
              <p className="text-sm text-accent">{fill(t.unit, lang, { n: unit.order })}</p>
              <h2 id={`${unit.id}-title`} className="mb-1 text-xl font-bold">
                {unit.title}
              </h2>
              <p className="mb-3 text-sm text-muted">{unit.description}</p>
              <div className="flex items-center gap-3 text-sm text-muted">
                <Bar percent={percent} label={unit.title} className="flex-1" />
                <span className="shrink-0">
                  {fill(lessons.length === 1 ? t.unitMetaOne : t.unitMeta, lang, {
                    lessons: lessons.length,
                    minutes,
                  })}
                </span>
              </div>
              <span className="sr-only">
                {done} / {lessons.length}
              </span>
            </header>

            <ol>
              {lessons.map((l) => {
                const p = stats.percentOf(l);
                return (
                  <li key={l.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/${lang}/lesson/${l.id}/`}
                      className="flex min-h-16 items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2"
                    >
                      {p === 100 ? (
                        <CheckCircle size={26} weight="fill" className="shrink-0 text-accent-2" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className={`grid size-[26px] shrink-0 place-items-center rounded-full border-2 text-xs ${
                            p > 0 ? "border-accent text-accent" : "border-border text-muted"
                          }`}
                        >
                          {fill("{n}", lang, { n: l.order })}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{l.title}</span>
                        <span className="block text-sm text-muted">
                          {fill(t.lessonMeta, lang, { slides: l.total, minutes: l.minutes })}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-sm ${p === 100 ? "text-accent-2" : p > 0 ? "text-accent" : "text-muted"}`}
                      >
                        {p === 100 ? t.done : p > 0 ? fill(t.percent, lang, { p }) : t.notStarted}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
