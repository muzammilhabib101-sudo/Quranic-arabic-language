import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SlideViewer from "@/components/SlideViewer";
import { lessonOfSlide, nextLesson, t as tx } from "@/content/course";
import { getSlide, slideCount, slideSrc } from "@/content/slides";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: slideCount }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/slides/[n]">): Promise<Metadata> {
  const { lang, n } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const lesson = lessonOfSlide(Number(n));
  const title = fill(dict.slides.title, lang, { n: Number(n) });
  return { title: lesson ? `${title} · ${tx(lesson.title, lang)}` : title };
}

export default async function SlidePage({
  params,
}: PageProps<"/[lang]/slides/[n]">) {
  const { lang, n: raw } = await params;
  const n = Number(raw);
  const slide = getSlide(n);
  const lesson = lessonOfSlide(n);
  if (!hasLocale(lang) || !slide || !lesson) notFound();
  const t = (await getDictionary(lang)).slides;
  const next = nextLesson(lesson.id);
  const { from, to } = lesson.sourceSlides;

  return (
    <>
      {/* The slide image carries the content; this names the page for screen readers. */}
      <h1 className="sr-only">
        {fill(t.title, lang, { n })} · {tx(lesson.title, lang)}
      </h1>
      <SlideViewer
        lang={lang}
        n={n}
        total={slideCount}
        width={slide.w}
        height={slide.h}
        src={slideSrc(n)}
        nextSrc={n < slideCount ? slideSrc(n + 1) : null}
        lesson={{ id: lesson.id, title: tx(lesson.title, lang), from, to }}
        nextLesson={next ? { id: next.id, title: tx(next.title, lang) } : null}
        labels={{
          counter: fill(t.counter, lang, { k: n - from + 1, total: to - from + 1 }),
          alt: fill(t.alt, lang, { n }),
          prev: t.prev,
          next: t.next,
          fullscreen: t.fullscreen,
          exitFullscreen: t.exitFullscreen,
          goTo: t.goTo,
          go: t.go,
          hint: t.hint,
          toLesson: t.toLesson,
          lessonDone: t.lessonDone,
          nextLesson: t.nextLesson,
          courseDone: t.courseDone,
          practise: t.practise,
        }}
      />
    </>
  );
}
