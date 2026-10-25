"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import type { LessonLite } from "@/content/course";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { lessonPercent, useHydrated, useStore } from "@/lib/store";
import Bar from "./Bar";

type Thumb = { n: number; src: string; w: number; h: number };

/** Start/continue button, lesson progress and the slide grid with viewed marks. */
export default function LessonActions({
  lang,
  lesson,
  next,
  thumbs,
  slideLabel,
  t,
}: {
  lang: Locale;
  lesson: LessonLite;
  next: LessonLite | null;
  thumbs: Thumb[];
  /** "Slide {n}" */
  slideLabel: string;
  t: Dictionary["lesson"];
}) {
  const hydrated = useHydrated();
  const progress = useStore((s) => s.lessons[lesson.id]);
  const p = hydrated ? progress : undefined;
  const seen = new Set(p?.seen ?? []);
  const percent = lessonPercent(p, lesson.total);
  const done = percent === 100;

  const firstUnseen = thumbs.find((s) => !seen.has(s.n))?.n ?? lesson.from;
  const position = firstUnseen - lesson.from + 1;
  const isText = lesson.format === "text";
  const learnHref = `/${lang}/lesson/${lesson.id}/learn/`;

  const primary =
    "inline-flex min-h-12 items-center gap-2 rounded-xl px-6 font-semibold transition-opacity hover:opacity-90";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <Bar percent={percent} label={lesson.title} />
        <div className="flex flex-wrap items-center gap-3">
          {done ? (
            <>
              <span className="flex items-center gap-2 font-semibold text-accent-2">
                <CheckCircle size={22} weight="fill" aria-hidden />
                {t.done}
              </span>
              {next && (
                <Link href={`/${lang}/lesson/${next.id}/`} className={`${primary} bg-accent text-accent-ink`}>
                  {t.next}: {next.title}
                  <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
                </Link>
              )}
              <Link
                href={isText ? learnHref : `/${lang}/slides/${lesson.from}/`}
                className="min-h-12 content-center rounded-xl border border-border px-5 hover:border-accent hover:text-accent"
              >
                {isText ? t.againText : t.again}
              </Link>
            </>
          ) : isText ? (
            <Link href={learnHref} className={`${primary} bg-accent text-accent-ink`}>
              {p?.steps && (p.step ?? 0) > 0
                ? fill(t.continueStep, lang, { k: (p.step ?? 0) + 1, total: p.steps })
                : t.startText}
              <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
            </Link>
          ) : (
            <Link href={`/${lang}/slides/${firstUnseen}/`} className={`${primary} bg-accent text-accent-ink`}>
              {seen.size > 0
                ? fill(t.continue, lang, { k: position, total: lesson.total })
                : t.start}
              <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <section aria-labelledby="lesson-slides">
        <h2 id="lesson-slides" className="mb-3 text-lg font-semibold">
          {isText ? t.originalSlides : t.slides}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {thumbs.map((s, i) => (
            <li key={s.n}>
              <Link
                href={`/${lang}/slides/${s.n}/`}
                aria-label={
                  fill(slideLabel, lang, { n: i + 1 }) + (seen.has(s.n) ? ` — ${t.seen}` : "")
                }
                className="relative block overflow-hidden rounded-xl border border-border bg-surface-2 transition-colors hover:border-accent"
              >
                <Image
                  src={s.src}
                  width={s.w}
                  height={s.h}
                  alt=""
                  className="aspect-[7/5] h-auto w-full object-cover brightness-[.85]"
                />
                <span className="flex items-center justify-between px-3 py-1 text-sm text-muted">
                  <span>{formatNumber(i + 1, lang)}</span>
                  {seen.has(s.n) && (
                    <CheckCircle size={18} weight="fill" className="text-accent-2" aria-hidden />
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
