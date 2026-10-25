export type Role = "noun" | "verb" | "particle";
export type SegKind = "pre" | "stem" | "suf";
export type Lang = "ur" | "en";

export type PracticeWord = {
  /** "surah:ayah:position" */
  id: string;
  verse: string;
  /** KFGQPC Hafs text — show with the `quran` font. */
  ar: string;
  tl: string | null;
  m: { ur: string; en: string };
  role: Role;
  root: string | null;
  pattern: string | null;
  /** Corpus segments (Unicode Uthmani — show with the `arabic` font); null for one-part words. */
  segs:
    | { t: string; k: SegKind; person: string | null; lemma: string | null; pron: boolean }[]
    | null;
  /** Shares its word-by-word meaning with a neighbour, so it isn't asked about alone. */
  grouped: boolean;
  lesson: string;
  unit: string;
  audio: string;
};

export type PracticeData = {
  words: PracticeWord[];
  verses: Record<string, { ids: string[]; t: { ur: string; en: string }; lesson: string }>;
  patterns: Record<string, { ar: string; meaning: { ur: string; en: string }; slide: number }>;
};

export const EXERCISE_TYPES = [
  "meaning",
  "match",
  "pattern",
  "root",
  "anatomy",
  "role",
  "fill",
  "translate",
  "listen",
  "flashcard",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** A question with one right option among several. */
export type ChoiceItem = {
  kind: "choice";
  type: "meaning" | "pattern" | "root" | "role" | "fill" | "listen";
  word: PracticeWord;
  options: { ar?: string; text?: string }[];
  answer: number;
  /** For role and fill: the verse the word sits in. */
  context?: PracticeWord[];
};

export type MatchItem = { kind: "match"; type: "match"; words: PracticeWord[]; meanings: string[] };
export type AnatomyItem = { kind: "anatomy"; type: "anatomy"; word: PracticeWord };
export type TranslateItem = {
  kind: "translate";
  type: "translate";
  words: PracticeWord[];
  /** Tiles in shuffled order; `index` is the word each belongs to, -1 for the extra one. */
  tiles: { text: string; index: number }[];
};
export type FlashItem = { kind: "flash"; type: "flashcard"; word: PracticeWord };

export type Item = ChoiceItem | MatchItem | AnatomyItem | TranslateItem | FlashItem;

/** Words an item practises — their review cards are updated by the answer. */
export function itemWords(item: Item): PracticeWord[] {
  return "words" in item ? item.words : [item.word];
}
