import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonPlayer from "@/components/player/LessonPlayer";
import type { PlayerData } from "@/components/player/types";
import {
  getLesson,
  getLessonContent,
  getVerse,
  getVerseWords,
  lessons,
  nextLesson,
  surahName,
  t as tx,
  type Text,
} from "@/content/course";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill, formatNumber } from "@/i18n/format";
import { asset } from "@/lib/base-path";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.filter((l) => l.format === "text").map((l) => ({ id: l.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/lesson/[id]/learn">): Promise<Metadata> {
  const { lang, id } = await params;
  const lesson = getLesson(id);
  if (!hasLocale(lang) || !lesson) return {};
  return { title: tx(lesson.title, lang) };
}

const pad = (n: number) => String(n).padStart(3, "0");

/** Resolves the lesson file and the verified Quran data into one language. */
async function playerData(id: string, lang: Locale): Promise<PlayerData> {
  const lesson = getLesson(id)!;
  const content = getLessonContent(id)!;
  const dict = await getDictionary(lang);
  let englishPending = false;
  const r = (text: Text) => {
    if (lang === "en" && !text.en) englishPending = true;
    return tx(text, lang);
  };

  const { surah, ayah } = content.verse;
  const ref = lesson.verseRefs[0];
  if (ref.surah !== surah || ref.ayah !== ayah) {
    throw new Error(`${id}: verse ${surah}:${ayah} does not match the course map (${ref.surah}:${ref.ayah})`);
  }
  const verse = getVerse(surah, ayah, lang);
  const quranWords = getVerseWords(surah, ayah);
  const next = nextLesson(id);

  const data: Omit<PlayerData, "englishPending"> = {
    lessonId: id,
    title: tx(lesson.title, lang),
    draft: content.status === "draft",
    slidesFrom: lesson.sourceSlides.from,
    goal: r(content.goal),
    concepts: content.concepts.map((c) => ({ title: r(c.title), body: r(c.body) })),
    verse: {
      text: verse.text,
      translation: verse.translation,
      translationCredit: fill(dict.lesson.translationBy, lang, { name: dict.lesson.translator }),
      transliteration: quranWords.map((w) => w.tl ?? "").join(" "),
      reference: `${surahName(surah, lang)} ${formatNumber(surah, lang)}:${formatNumber(ayah, lang)}`,
      audio: asset(`/audio/verses/${pad(surah)}${pad(ayah)}.mp3`),
    },
    words: content.words.map((w) => {
      const q = quranWords.find((x) => x.p === w.position);
      if (!q) throw new Error(`${id}: verse ${surah}:${ayah} has no word ${w.position}`);
      return {
        id: `${surah}:${ayah}:${w.position}`,
        ar: q.ar,
        transliteration: q.tl,
        meaning: r(w.meaning),
        meaningText: w.meaning,
        role: q.role ?? w.parts.at(-1)!.role,
        root: q.root ? [...q.root].join(" ") : null,
        pattern: w.pattern ?? null,
        patternMeaning: w.patternMeaning ? r(w.patternMeaning) : null,
        parts: w.parts.map((p) => ({ text: p.text, role: p.role, label: r(p.label) })),
        why: r(w.why),
        audio: asset(`/audio/words/${pad(surah)}_${pad(ayah)}_${pad(w.position)}.mp3`),
      };
    }),
    flow: content.connect.flow.map((f) => ({
      text: f.words
        ? f.words.map((p) => {
            const q = quranWords.find((x) => x.p === p);
            if (!q) throw new Error(`${id}: flow uses word ${p}, which verse ${surah}:${ayah} lacks`);
            return q.ar;
          }).join(" ")
        : f.text!,
      // Verse words use the Quran font; typed fragments use Amiri.
      quran: !!f.words,
      role: f.role,
      label: r(f.label),
    })),
    plain: r(content.connect.plain),
    rule: r(content.remember.rule),
    points: content.remember.points.map(r),
    check: content.check.map((q) => ({
      id: q.id,
      prompt: r(q.prompt),
      arabic: q.arabic ?? null,
      options: q.options.map((o) => ("ar" in o ? { ar: o.ar } : { text: r(o.text) })),
      answer: q.answer,
      explanation: r(q.explanation),
    })),
    next: next ? { id: next.id, title: tx(next.title, lang) } : null,
  };
  // Set while resolving the texts above, so it is read last.
  return { ...data, englishPending };
}

export default async function LearnPage({
  params,
}: PageProps<"/[lang]/lesson/[id]/learn">) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !getLessonContent(id)) notFound();
  const dict = await getDictionary(lang);
  const data = await playerData(id, lang);

  return (
    <LessonPlayer
      lang={lang}
      data={data}
      t={dict.player}
      roles={dict.home.roles}
    />
  );
}
