import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Barbell } from "@phosphor-icons/react/ssr";
import LessonActions from "@/components/LessonActions";
import Mixed from "@/components/Mixed";
import Verse from "@/components/Verse";
import {
  courseIndex,
  getLesson,
  getUnit,
  getVerse,
  lessons,
  nextLesson,
  slideCountOf,
  surahName,
  t as tx,
} from "@/content/course";
import { getSlide, THUMB_WIDTH, thumbSrc } from "@/content/slides";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { normalize } from "@/lib/arabic";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ id: l.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/lesson/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const lesson = getLesson(id);
  if (!hasLocale(lang) || !lesson) return {};
  return { title: tx(lesson.title, lang) };
}

export default async function LessonPage({
  params,
}: PageProps<"/[lang]/lesson/[id]">) {
  const { lang, id } = await params;
  const lesson = getLesson(id);
  if (!hasLocale(lang) || !lesson) notFound();
  const dict = await getDictionary(lang);
  const t = dict.lesson;
  const unit = getUnit(lesson.unitId)!;

  const index = courseIndex(lang);
  const lite = index.lessons.find((l) => l.id === id)!;
  const next = nextLesson(id);
  const nextLite = next ? index.lessons.find((l) => l.id === next.id)! : null;

  const { from, to } = lesson.sourceSlides;
  const thumbs = Array.from({ length: to - from + 1 }, (_, i) => {
    const n = from + i;
    const s = getSlide(n)!;
    return { n, src: thumbSrc(n), w: THUMB_WIDTH, h: Math.round((THUMB_WIDTH * s.h) / s.w) };
  });

  const ref = lesson.verseRefs[0];
  const verse = getVerse(ref.surah, ref.ayah, lang);

  return (
    <div className="flex flex-col gap-6" data-pagefind-body>
      <Link
        href={`/${lang}/course/#${unit.id}`}
        className="flex min-h-11 items-center gap-2 self-start text-sm text-muted hover:text-accent"
      >
        <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
        {t.back}
      </Link>

      <header>
        <p className="text-sm text-accent">
          {fill(t.unit, lang, { n: unit.order })} · {tx(unit.title, lang)}
        </p>
        <h1 className="mb-1 text-3xl font-bold" data-pagefind-meta="title">
          <Mixed text={tx(lesson.title, lang)} />
        </h1>
        {/* Bare-letter verse and key words so search works without harakat. */}
        <span className="hidden">{normalize([verse.text, ...lesson.keyWords].join(" "))}</span>
        {lesson.format === "text" && lesson.status === "draft" && (
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 text-xs text-accent">
              {t.draft}
            </span>
            {t.draftHint}
          </p>
        )}
        <p className="text-muted">
          {fill(t.slideMeta, lang, {
            slides: slideCountOf(lesson),
            minutes: lesson.estMinutes,
          })}
        </p>
      </header>

      <section aria-label={t.verse}>
        <Verse
          lang={lang}
          text={verse.text}
          translation={verse.translation}
          surahName={surahName(ref.surah, lang)}
          surah={ref.surah}
          ayah={ref.ayah}
          credit={fill(t.translationBy, lang, { name: t.translator })}
        />
      </section>

      <LessonActions
        lang={lang}
        lesson={lite}
        next={nextLite}
        thumbs={thumbs}
        slideLabel={dict.slides.title}
        t={t}
      />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <Barbell size={28} className="shrink-0 text-accent" aria-hidden />
          <div>
            <h2 className="font-semibold">{dict.practice.practiseLesson}</h2>
            <p className="text-sm text-muted">{dict.practice.practiseLessonHint}</p>
          </div>
        </div>
        <Link
          href={`/${lang}/practice/lesson/${lesson.id}/`}
          className="inline-flex min-h-12 items-center rounded-xl border border-accent px-5 font-semibold text-accent hover:bg-accent/10"
        >
          {dict.practice.practiseLesson}
        </Link>
      </section>
    </div>
  );
}
