import type {
  ChoiceItem,
  ExerciseType,
  Item,
  Lang,
  PracticeData,
  PracticeWord,
} from "./types";

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const meaningOf = (w: PracticeWord, lang: Lang) => (w.m[lang] || w.m.ur).trim();
const askable = (w: PracticeWord, lang: Lang) => !w.grouped && meaningOf(w, lang).length > 0;
/**
 * How a word looks: the Arabic without pause and annotation marks (ۚ ۖ…) or
 * spaces, so فِيهَا and فِيهَا ۚ count as the same word. Harakat stay — they
 * tell words apart.
 */
const shape = (w: PracticeWord) => w.ar.replace(/[ۖ-ۭ\s]/g, "");

/**
 * Picks `n` distractors: different from the answer by `key` (and by
 * `distinct`, when given), and as close to the word as possible — same
 * lesson first, then unit, then anywhere.
 */
function distractors<T>(
  word: PracticeWord,
  pool: PracticeWord[],
  all: PracticeWord[],
  key: (w: PracticeWord) => T | null,
  n: number,
  prefer?: (w: PracticeWord) => boolean,
  distinct?: (w: PracticeWord) => string,
): PracticeWord[] {
  const answer = key(word);
  const seen = new Set<T>([answer as T]);
  const seenAlso = new Set<string>(distinct ? [distinct(word)] : []);
  const out: PracticeWord[] = [];
  const tiers = [
    pool.filter((w) => w.lesson === word.lesson),
    pool.filter((w) => w.unit === word.unit),
    pool,
    all,
  ].map((tier) => shuffle(tier));
  if (prefer) tiers.forEach((t) => t.sort((a, b) => Number(prefer(b)) - Number(prefer(a))));
  for (const tier of tiers) {
    for (const w of tier) {
      const k = key(w);
      if (k === null || seen.has(k)) continue;
      if (distinct && seenAlso.has(distinct(w))) continue;
      seen.add(k);
      if (distinct) seenAlso.add(distinct(w));
      out.push(w);
      if (out.length === n) return out;
    }
  }
  return out;
}

function choice(
  type: ChoiceItem["type"],
  word: PracticeWord,
  right: { ar?: string; text?: string },
  wrong: { ar?: string; text?: string }[],
  context?: PracticeWord[],
): ChoiceItem | null {
  if (wrong.length < 2) return null;
  const options = shuffle([right, ...wrong]);
  return { kind: "choice", type, word, options, answer: options.indexOf(right), context };
}

const ROLES = ["noun", "verb", "particle"] as const;

/** One exercise of `type` about `word`, or null when the data can't support it. */
export function makeItem(
  type: ExerciseType,
  word: PracticeWord,
  pool: PracticeWord[],
  data: PracticeData,
  lang: Lang,
): Item | null {
  const all = data.words;
  const verseWords = () => data.verses[word.verse].ids.map((id) => all.find((w) => w.id === id)!);

  switch (type) {
    case "meaning": {
      if (!askable(word, lang)) return null;
      const wrong = distractors(word, pool.filter((w) => askable(w, lang)), all.filter((w) => askable(w, lang)), (w) => meaningOf(w, lang), 3, (w) => w.role === word.role);
      return choice("meaning", word, { text: meaningOf(word, lang) }, wrong.map((w) => ({ text: meaningOf(w, lang) })));
    }
    case "listen": {
      const wrong = distractors(word, pool, all, shape, 3, (w) => w.root === word.root || w.role === word.role);
      return choice("listen", word, { ar: word.ar }, wrong.map((w) => ({ ar: w.ar })));
    }
    case "root": {
      if (!word.root) return null;
      const wrong = distractors(word, pool, all, (w) => w.root, 3);
      return choice("root", word, { ar: word.root }, wrong.map((w) => ({ ar: w.root! })));
    }
    case "pattern": {
      if (!word.pattern) return null;
      const keys = shuffle(Object.keys(data.patterns).filter((k) => k !== word.pattern)).slice(0, 3);
      return choice(
        "pattern",
        word,
        { ar: data.patterns[word.pattern].ar },
        keys.map((k) => ({ ar: data.patterns[k].ar })),
      );
    }
    case "role": {
      const right = word.role;
      const options = ROLES.map((r) => ({ text: r }));
      return { kind: "choice", type: "role", word, options, answer: ROLES.indexOf(right), context: verseWords() };
    }
    case "fill": {
      const context = verseWords();
      if (context.length < 3) return null;
      // Options are real words; only the right one completes the verse as revealed.
      const wrong = distractors(word, pool, all, shape, 3, (w) => w.role === word.role);
      return choice("fill", word, { ar: word.ar }, wrong.map((w) => ({ ar: w.ar })), context);
    }
    case "anatomy":
      return word.segs ? { kind: "anatomy", type: "anatomy", word } : null;
    case "flashcard":
      return { kind: "flash", type: "flashcard", word };
    case "match": {
      if (!askable(word, lang)) return null;
      // Different meanings and different-looking words: the same word twice
      // (ٱلَّذِينَ as «وہ لوگ» and «وہ لوگ ہیں») can't be told apart.
      const others = distractors(word, pool.filter((w) => askable(w, lang)), all.filter((w) => askable(w, lang)), (w) => meaningOf(w, lang), 3, undefined, shape);
      if (others.length < 3) return null;
      const words = [word, ...others];
      return { kind: "match", type: "match", words, meanings: shuffle(words.map((w) => meaningOf(w, lang))) };
    }
    case "translate": {
      // A run of 3–4 consecutive words of the verse, all with their own meaning.
      const context = verseWords();
      const start = context.indexOf(word);
      for (const len of [4, 3]) {
        for (let s = Math.max(0, start - len + 1); s <= start; s++) {
          const run = context.slice(s, s + len);
          if (run.length !== len || !run.every((w) => askable(w, lang))) continue;
          if (new Set(run.map((w) => meaningOf(w, lang))).size !== len) continue;
          const extra = distractors(word, pool.filter((w) => askable(w, lang)), all, (w) => meaningOf(w, lang), 1)
            .filter((w) => !run.some((r) => meaningOf(r, lang) === meaningOf(w, lang)));
          const tiles = shuffle([
            ...run.map((w, i) => ({ text: meaningOf(w, lang), index: i })),
            ...extra.map((w) => ({ text: meaningOf(w, lang), index: -1 })),
          ]);
          return { kind: "translate", type: "translate", words: run, tiles };
        }
      }
      return null;
    }
  }
}

/**
 * A practice set over `words`: tries to cover the wanted types, asks about
 * the same word twice in a row only when no other word fits the type, and
 * fills up with meaning questions.
 */
export function buildSet(
  words: PracticeWord[],
  types: readonly ExerciseType[],
  size: number,
  data: PracticeData,
  lang: Lang,
): Item[] {
  const items: Item[] = [];
  const used = new Map<string, number>();
  const byUse = () => shuffle(words).sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0));

  const queue = [...types];
  let guard = 0;
  while (items.length < size && guard++ < size * 12) {
    const type = queue.length ? queue.shift()! : (["meaning", "listen", "root", "fill"] as const)[guard % 4];
    // The word of a one-word item just asked goes last, so it repeats only
    // when no other word can make this type.
    const prev = items.at(-1);
    const last = prev && !("words" in prev) ? prev.word.id : null;
    const order = byUse().sort((a, b) => Number(a.id === last) - Number(b.id === last));
    for (const w of order) {
      const item = makeItem(type, w, words, data, lang);
      if (!item) continue;
      items.push(item);
      for (const x of "words" in item ? item.words : [item.word]) used.set(x.id, (used.get(x.id) ?? 0) + 1);
      break;
    }
  }
  return items;
}

/**
 * The mix used for lesson and unit practice. Pattern comes last because
 * few words have one; when it can't be made, a fill-up type takes its place.
 */
export const MIXED: readonly ExerciseType[] = [
  "meaning",
  "listen",
  "match",
  "root",
  "translate",
  "role",
  "fill",
  "anatomy",
  "pattern",
  "meaning",
];
