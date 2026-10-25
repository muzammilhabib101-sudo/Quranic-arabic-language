import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import map from "@content/course-map.json";
import type { Locale } from "@/i18n/config";
import { LessonContent, type LessonContentT } from "./schema";

export type Text = { ur: string; en?: string };

export type Unit = {
  id: string;
  order: number;
  title: Text;
  description: Text;
  surah: number;
  lessonIds: string[];
};

export type Lesson = {
  id: string;
  unitId: string;
  order: number;
  title: Text;
  format: "slides" | "text";
  status: "draft" | "reviewed";
  sourceSlides: { from: number; to: number };
  verseRefs: { surah: number; ayah: number }[];
  estMinutes: number;
  topics: { n: number; type: string; text: string }[];
  keyWords: string[];
};

const lessonFile = (id: string) => join(process.cwd(), "content", "lessons", `${id}.json`);

/**
 * A lesson is a text lesson once content/lessons/<id>.json exists. The file
 * is validated here, so a broken lesson fails the build instead of a page.
 */
export function getLessonContent(id: string): LessonContentT | undefined {
  const file = lessonFile(id);
  if (!existsSync(file)) return undefined;
  const result = LessonContent.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!result.success) {
    throw new Error(`content/lessons/${id}.json is invalid:
${result.error.message}`);
  }
  if (result.data.id !== id) throw new Error(`content/lessons/${id}.json has id "${result.data.id}"`);
  return result.data;
}

export const units = map.units as Unit[];
export const lessons = (map.lessons as Lesson[]).map((l): Lesson => {
  const content = getLessonContent(l.id);
  return content ? { ...l, format: "text", status: content.status } : l;
});

export const getLesson = (id: string) => lessons.find((l) => l.id === id);
export const getUnit = (id: string) => units.find((u) => u.id === id);

export const lessonOfSlide = (n: number) =>
  lessons.find((l) => n >= l.sourceSlides.from && n <= l.sourceSlides.to);

/** The lesson after this one across the whole course, if any. */
export function nextLesson(id: string) {
  const i = lessons.findIndex((l) => l.id === id);
  return i >= 0 ? lessons[i + 1] : undefined;
}

export const slideCountOf = (l: Lesson) =>
  l.sourceSlides.to - l.sourceSlides.from + 1;

/** Urdu always exists; English falls back to Urdu until it is written. */
export const t = (text: Text, lang: Locale) =>
  lang === "en" ? (text.en ?? text.ur) : text.ur;

// ---------- Lightweight shapes for client components ----------

export type LessonLite = {
  id: string;
  unitId: string;
  order: number;
  title: string;
  from: number;
  to: number;
  total: number;
  minutes: number;
  format: "slides" | "text";
};

export type UnitLite = {
  id: string;
  order: number;
  title: string;
  description: string;
  lessonIds: string[];
};

export function courseIndex(lang: Locale) {
  return {
    units: units.map<UnitLite>((u) => ({
      id: u.id,
      order: u.order,
      title: t(u.title, lang),
      description: t(u.description, lang),
      lessonIds: u.lessonIds,
    })),
    lessons: lessons.map<LessonLite>((l) => ({
      id: l.id,
      unitId: l.unitId,
      order: l.order,
      title: t(l.title, lang),
      from: l.sourceSlides.from,
      to: l.sourceSlides.to,
      total: slideCountOf(l),
      minutes: l.estMinutes,
      format: l.format,
    })),
  };
}

export type CourseIndex = ReturnType<typeof courseIndex>;

// ---------- Verses (read at build time from content/quran) ----------

export type QuranWord = {
  p: number;
  ar: string;
  tl: string | null;
  en: string | null;
  ur: string | null;
  role: "noun" | "verb" | "particle" | null;
  root: string | null;
};

type VerseFile = Record<string, { q: string; t: { en: string; ur: string }; w: QuranWord[] }>;

const verseFiles = new Map<number, VerseFile>();

function verseFile(surah: number): VerseFile {
  let file = verseFiles.get(surah);
  if (!file) {
    const path = join(
      process.cwd(),
      "content",
      "quran",
      "words",
      `${String(surah).padStart(3, "0")}.json`,
    );
    file = JSON.parse(readFileSync(path, "utf8")) as VerseFile;
    verseFiles.set(surah, file);
  }
  return file;
}

/** The words of one verse, with corpus morphology. */
export const getVerseWords = (surah: number, ayah: number) => verseFile(surah)[ayah].w;

/** KFGQPC Hafs text and translation of one verse. */
export function getVerse(surah: number, ayah: number, lang: Locale) {
  const v = verseFile(surah)[ayah];
  return { text: v.q, translation: v.t[lang] };
}

type Surah = { n: number; ar: string; en: string; meaning: { en: string; ur: string } };
const surahs: Surah[] = JSON.parse(
  readFileSync(join(process.cwd(), "content", "quran", "surahs.json"), "utf8"),
);

export const surahName = (n: number, lang: Locale) => {
  const s = surahs.find((x) => x.n === n)!;
  return lang === "ur" ? s.ar : s.en;
};
