import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Mixed from "@/components/Mixed";
import { getLesson, getLessonContent, getVerseWords, lessons, type Text } from "@/content/course";
import { getSlide, slideSrc } from "@/content/slides";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const dynamicParams = false;
export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return lessons.filter((l) => l.format === "text").map((l) => ({ id: l.id }));
}

/** Urdu and English of one field side by side, flagging missing English. */
function Both({ text, missing }: { text: Text; missing: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <p lang="ur" dir="rtl" className="rounded-lg bg-surface-2 p-3">
        <Mixed text={text.ur} />
      </p>
      <p lang="en" dir="ltr" className={`rounded-lg p-3 ${text.en ? "bg-surface-2" : "border border-dashed border-wrong text-wrong"}`}>
        {text.en ? <Mixed text={text.en} /> : missing}
      </p>
    </div>
  );
}

export default async function ReviewLessonPage({ params }: PageProps<"/[lang]/review/[id]">) {
  const { lang, id } = await params;
  const lesson = getLesson(id);
  const c = getLessonContent(id);
  if (!hasLocale(lang) || !lesson || !c) notFound();
  const t = (await getDictionary(lang)).review;
  const quranWords = getVerseWords(c.verse.surah, c.verse.ayah);
  const { from, to } = lesson.sourceSlides;
  const slides = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const card = "rounded-2xl border border-border bg-surface p-4";
  const h = "mb-2 font-semibold text-accent";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${lang}/review/`} className="text-sm text-muted hover:text-accent">
            ← {t.title}
          </Link>
          <h1 className="text-2xl font-bold">
            {id} · <Mixed text={lesson.title.ur} />
          </h1>
          <p className="text-sm text-muted">
            {t.status}: {c.status === "reviewed" ? `${t.reviewed} (${c.reviewedBy ?? ""})` : t.draft} · {t.slides}: {from}–{to}
          </p>
        </div>
        <Link href={`/${lang}/lesson/${id}/learn/`} className="min-h-11 content-center rounded-xl border border-accent px-4 text-accent">
          {t.open}
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div className="flex flex-col gap-4">
          <section className={card}>
            <h2 className={h}>{t.goal}</h2>
            <Both text={c.goal} missing={t.noEnglish} />
          </section>
          <section className={card}>
            <h2 className={h}>{t.concepts}</h2>
            <div className="flex flex-col gap-3">
              {c.concepts.map((x, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Both text={x.title} missing={t.noEnglish} />
                  <Both text={x.body} missing={t.noEnglish} />
                </div>
              ))}
            </div>
          </section>
          <section className={card}>
            <h2 className={h}>{t.words}</h2>
            <div className="flex flex-col gap-5">
              {c.words.map((w) => {
                const q = quranWords.find((x) => x.p === w.position);
                return (
                  <div key={w.position} className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0">
                    <p className="flex flex-wrap items-baseline gap-3">
                      <span lang="ar" className="quran text-3xl">
                        {q?.ar ?? `⚠ word ${w.position} not in verse`}
                      </span>
                      <span className="text-sm text-muted">
                        #{w.position} · {w.parts.map((p) => `${p.text} (${p.role})`).join(" + ")}
                        {w.pattern && ` · ${w.pattern}`}
                      </span>
                    </p>
                    <Both text={w.meaning} missing={t.noEnglish} />
                    {w.patternMeaning && <Both text={w.patternMeaning} missing={t.noEnglish} />}
                    <Both text={w.why} missing={t.noEnglish} />
                  </div>
                );
              })}
            </div>
          </section>
          <section className={card}>
            <h2 className={h}>{t.connect}</h2>
            <div className="flex flex-col gap-2">
              <p dir="rtl" lang="ar" className="arabic text-2xl">
                {c.connect.flow
                  .map((f) => f.text ?? f.words!.map((p) => quranWords.find((x) => x.p === p)?.ar ?? "⚠").join(" "))
                  .join(" ← ")}
              </p>
              <Both text={c.connect.plain} missing={t.noEnglish} />
              <Both text={c.remember.rule} missing={t.noEnglish} />
              {c.remember.points.map((p, i) => (
                <Both key={i} text={p} missing={t.noEnglish} />
              ))}
            </div>
          </section>
          <section className={card}>
            <h2 className={h}>{t.check}</h2>
            <ol className="flex flex-col gap-4">
              {c.check.map((q) => (
                <li key={q.id} className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0">
                  <Both text={q.prompt} missing={t.noEnglish} />
                  <ul className="flex flex-wrap gap-2 text-sm">
                    {q.options.map((o, i) => (
                      <li key={i} className={`rounded-lg px-3 py-1 ${i === q.answer ? "bg-accent-2/20 text-accent-2" : "bg-surface-2"}`}>
                        {"ar" in o ? <span lang="ar" className="arabic text-lg">{o.ar}</span> : <Mixed text={`${o.text.ur} / ${o.text.en ?? "—"}`} />}
                        {i === q.answer && ` ✓ ${t.answer}`}
                      </li>
                    ))}
                  </ul>
                  <Both text={q.explanation} missing={t.noEnglish} />
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside aria-label={t.slides} className="flex flex-col gap-3 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          {slides.map((n) => {
            const s = getSlide(n)!;
            return (
              <figure key={n} className="rounded-xl border border-border bg-surface p-2">
                <Image src={slideSrc(n)} width={s.w} height={s.h} alt={`Slide ${n}`} className="h-auto w-full rounded-lg" />
                <figcaption className="pt-1 text-center text-xs text-muted">{n}</figcaption>
              </figure>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
