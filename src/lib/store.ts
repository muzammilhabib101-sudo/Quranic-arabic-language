"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { newCard, Rating, review, type Grade, type StoredCard } from "./practice/srs";

export const STORE_KEY = "qa-store";

export type Settings = {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  transliteration: boolean;
};

export type LessonProgress = {
  /** Slide numbers of this lesson that have been viewed. */
  seen: number[];
  /** Text lessons: furthest step reached (0-based) and how many steps there are. */
  step?: number;
  steps?: number;
  /** Local date (YYYY-MM-DD) the lesson was finished. */
  done?: string;
};

export type SavedWord = {
  /** "surah:ayah:position" */
  id: string;
  ar: string;
  meaning: { ur: string; en?: string };
  lessonId: string;
};

export type PracticeStats = {
  answered: number;
  correct: number;
  /** Per unit, for the strong/weak summary on the Progress page. */
  units: Record<string, { answered: number; correct: number }>;
  /** Lessons whose practice set was finished, with the date. */
  lessons: Record<string, string>;
};

type Data = {
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  lastSlide: number | null;
  /** The lesson most recently studied, in either format. */
  lastLesson: string | null;
  savedWords: SavedWord[];
  /** Local dates (YYYY-MM-DD) with any learning, sorted, unique. */
  activeDays: string[];
  /** Spaced-repetition cards, one per word id. */
  cards: Record<string, StoredCard>;
  practice: PracticeStats;
};

type Actions = {
  /** Records an answer and schedules the words' next review (right → Good, wrong → Again). */
  answer: (wordIds: string[], unitId: string, correct: boolean, countStats?: boolean) => void;
  /** A flashcard self-rating. */
  rate: (wordId: string, grade: Grade) => void;
  finishPractice: (lessonId: string | null) => void;
  viewSlide: (n: number, lessonId: string, lessonTotal: number) => void;
  reachStep: (lessonId: string, step: number, steps: number) => void;
  completeLesson: (lessonId: string) => void;
  toggleWord: (word: SavedWord) => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
  importData: (raw: unknown) => boolean;
  resetProgress: () => void;
};

const defaultSettings: Settings = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
  transliteration: true,
};

const empty: Data = {
  settings: defaultSettings,
  lessons: {},
  lastSlide: null,
  lastLesson: null,
  savedWords: [],
  activeDays: [],
  cards: {},
  practice: { answered: 0, correct: 0, units: {}, lessons: {} },
};

export function today(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDay(days: string[], day: string) {
  return days.includes(day) ? days : [...days, day].sort();
}

const isInt = (n: unknown): n is number => Number.isInteger(n);

/** Checks a backup file's shape before it replaces anything. */
function parseBackup(raw: unknown): Data | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Data>;
  if (typeof d.lessons !== "object" || d.lessons === null) return null;
  if (!Array.isArray(d.activeDays)) return null;
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, p] of Object.entries(d.lessons)) {
    if (!p || !Array.isArray(p.seen)) return null;
    lessons[id] = {
      seen: p.seen.filter(isInt),
      ...(isInt(p.step) && isInt(p.steps) ? { step: p.step, steps: p.steps } : {}),
      ...(typeof p.done === "string" ? { done: p.done } : {}),
    };
  }
  const savedWords = (Array.isArray(d.savedWords) ? d.savedWords : []).filter(
    (w): w is SavedWord =>
      !!w && typeof w.id === "string" && typeof w.ar === "string" &&
      typeof w.lessonId === "string" && typeof w.meaning?.ur === "string",
  );
  const cards: Record<string, StoredCard> = {};
  for (const [id, c] of Object.entries(d.cards ?? {})) {
    if (c && typeof c.due === "string" && !Number.isNaN(Date.parse(c.due))) cards[id] = c;
  }
  const pr = d.practice;
  const practice: PracticeStats =
    pr && isInt(pr.answered) && isInt(pr.correct)
      ? { answered: pr.answered, correct: pr.correct, units: pr.units ?? {}, lessons: pr.lessons ?? {} }
      : empty.practice;
  return {
    cards,
    practice,
    settings: { ...defaultSettings, ...(d.settings ?? {}) },
    lessons,
    lastSlide: isInt(d.lastSlide) ? d.lastSlide : null,
    lastLesson: typeof d.lastLesson === "string" ? d.lastLesson : null,
    savedWords,
    activeDays: d.activeDays.filter((x) => typeof x === "string").sort(),
  };
}

export const useStore = create<Data & Actions>()(
  persist(
    (set) => ({
      ...empty,

      viewSlide: (n, lessonId, lessonTotal) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? { seen: [] };
          const seen = prev.seen.includes(n) ? prev.seen : [...prev.seen, n];
          // Viewing every slide finishes a slides-only lesson; text lessons
          // finish through their own steps.
          const done =
            prev.done ?? (!prev.steps && seen.length >= lessonTotal ? today() : undefined);
          return {
            lastSlide: n,
            lastLesson: lessonId,
            activeDays: addDay(s.activeDays, today()),
            lessons: { ...s.lessons, [lessonId]: { ...prev, seen, ...(done ? { done } : {}) } },
          };
        }),

      reachStep: (lessonId, step, steps) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? { seen: [] };
          return {
            lastLesson: lessonId,
            activeDays: addDay(s.activeDays, today()),
            lessons: {
              ...s.lessons,
              [lessonId]: { ...prev, step: Math.max(prev.step ?? 0, step), steps },
            },
          };
        }),

      completeLesson: (lessonId) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? { seen: [] };
          return {
            lastLesson: lessonId,
            activeDays: addDay(s.activeDays, today()),
            lessons: { ...s.lessons, [lessonId]: { ...prev, done: prev.done ?? today() } },
          };
        }),

      answer: (wordIds, unitId, correct, countStats = true) =>
        set((s) => {
          const now = new Date();
          const cards = { ...s.cards };
          for (const id of wordIds) cards[id] = review(cards[id], correct ? Rating.Good : Rating.Again, now);
          if (!countStats) return { cards, activeDays: addDay(s.activeDays, today()) };
          const u = s.practice.units[unitId] ?? { answered: 0, correct: 0 };
          return {
            cards,
            activeDays: addDay(s.activeDays, today()),
            practice: {
              ...s.practice,
              answered: s.practice.answered + 1,
              correct: s.practice.correct + (correct ? 1 : 0),
              units: { ...s.practice.units, [unitId]: { answered: u.answered + 1, correct: u.correct + (correct ? 1 : 0) } },
            },
          };
        }),

      rate: (wordId, grade) =>
        set((s) => ({
          cards: { ...s.cards, [wordId]: review(s.cards[wordId], grade) },
          activeDays: addDay(s.activeDays, today()),
        })),

      finishPractice: (lessonId) =>
        set((s) =>
          lessonId
            ? { practice: { ...s.practice, lessons: { ...s.practice.lessons, [lessonId]: today() } } }
            : {},
        ),

      toggleWord: (word) =>
        set((s) =>
          s.savedWords.some((w) => w.id === word.id)
            ? { savedWords: s.savedWords.filter((w) => w.id !== word.id) }
            : {
                savedWords: [...s.savedWords, word],
                // A saved word joins the review queue at once; unsaving keeps its history.
                cards: s.cards[word.id] ? s.cards : { ...s.cards, [word.id]: newCard() },
              },
        ),

      setSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),

      importData: (raw) => {
        const data = parseBackup(raw);
        if (!data) return false;
        set(data);
        return true;
      },

      resetProgress: () =>
        set((s) => ({ ...empty, settings: s.settings })),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ settings, lessons, lastSlide, lastLesson, savedWords, activeDays, cards, practice }) => ({
        settings,
        lessons,
        lastSlide,
        lastLesson,
        savedWords,
        activeDays,
        cards,
        practice,
      }),
    },
  ),
);

/** The data a backup file contains. */
export function exportData(): Data {
  const { settings, lessons, lastSlide, lastLesson, savedWords, activeDays, cards, practice } =
    useStore.getState();
  return { settings, lessons, lastSlide, lastLesson, savedWords, activeDays, cards, practice };
}

const noop = () => () => {};

/**
 * False during the server render and hydration, true afterwards. Progress
 * lives in the browser, so components show neutral values until then.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// ---------- Derived values ----------

export function lessonPercent(p: LessonProgress | undefined, totalSlides: number) {
  if (!p) return 0;
  if (p.done) return 100;
  const bySlides = p.seen.length / totalSlides;
  const bySteps = p.steps ? (p.step ?? 0) / p.steps : 0;
  return Math.min(99, Math.round(Math.max(bySlides, bySteps) * 100));
}

/** Consecutive active days ending today (or yesterday, so it isn't lost mid-day). */
export function streak(activeDays: string[], now = new Date()) {
  const set = new Set(activeDays);
  const day = new Date(now);
  if (!set.has(today(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (set.has(today(day))) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}
