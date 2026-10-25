import type { RoleT } from "@/content/schema";

/** One lesson resolved into the active language, ready for the player. */
export type PlayerData = {
  lessonId: string;
  title: string;
  draft: boolean;
  slidesFrom: number;
  /** True when English text fell back to Urdu somewhere in this lesson. */
  englishPending: boolean;
  goal: string;
  concepts: { title: string; body: string }[];
  verse: {
    text: string;
    translation: string;
    translationCredit: string;
    transliteration: string;
    reference: string;
    audio: string;
  };
  words: PlayerWord[];
  flow: { text: string; quran: boolean; role: RoleT; label: string }[];
  plain: string;
  rule: string;
  points: string[];
  check: PlayerQuestion[];
  next: { id: string; title: string } | null;
};

export type PlayerWord = {
  /** "surah:ayah:position" */
  id: string;
  ar: string;
  transliteration: string | null;
  meaning: string;
  /** Both languages, kept for the saved-words list. */
  meaningText: { ur: string; en?: string };
  role: RoleT;
  root: string | null;
  pattern: string | null;
  patternMeaning: string | null;
  parts: { text: string; role: RoleT; label: string }[];
  why: string;
  audio: string;
};

export type PlayerQuestion = {
  id: string;
  prompt: string;
  arabic: string | null;
  options: { ar?: string; text?: string }[];
  answer: number;
  explanation: string;
};
