import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import patternFile from "@content/practice/patterns.json";
import meaningFixes from "@content/quran/meaning-fixes.json";
import { normalize } from "@/lib/arabic";
import { asset } from "@/lib/base-path";
import { lessons } from "./course";

type Role = "noun" | "verb" | "particle";

export type DictForm = {
  ar: string;
  m: { ur: string; en: string };
  /** "surah:ayah:position" */
  ref: string;
  lesson: string;
  audio: string;
};

export type DictEntry = {
  /** Corpus lemma (Unicode Uthmani — Amiri font), or the word itself when there is none. */
  lemma: string;
  role: Role;
  pattern: { key: string; ar: string } | null;
  count: number;
  forms: DictForm[];
  /** Bare letters of the lemma, forms and meanings, for filtering and search. */
  search: string;
};

export type DictRoot = {
  /** "ر ح م", or null for particles, pronouns and names without a root. */
  root: string | null;
  entries: DictEntry[];
};

type Raw = {
  p: number;
  ar: string;
  u: string;
  ur: string | null;
  en: string | null;
  role: Role | null;
  root: string | null;
  lemma: string | null;
};

const pad = (n: number) => String(n).padStart(3, "0");
const fixOf = (id: string) =>
  (meaningFixes.fixes as Record<string, { ur?: string; en?: string }>)[id];
const MAX_FORMS = 6;

const patternOfLemma = new Map<string, { key: string; ar: string }>();
for (const [key, p] of Object.entries(patternFile.patterns)) {
  for (const lemma of p.lemmas) patternOfLemma.set(lemma, { key, ar: p.ar });
}

/** Every word in the course, grouped by root and then by lemma. */
export function dictionary(): DictRoot[] {
  const byRoot = new Map<string, Map<string, DictEntry>>();
  const files = new Map<number, Record<string, { w: Raw[] }>>();

  for (const lesson of lessons) {
    for (const { surah, ayah } of lesson.verseRefs) {
      if (!files.has(surah)) {
        const path = join(process.cwd(), "content", "quran", "words", `${pad(surah)}.json`);
        files.set(surah, JSON.parse(readFileSync(path, "utf8")));
      }
      for (const w of files.get(surah)![ayah].w) {
        const rootKey = w.root ?? "";
        const lemma = w.lemma ?? w.u;
        const role = w.role ?? "particle";
        const entries = byRoot.get(rootKey) ?? new Map<string, DictEntry>();
        byRoot.set(rootKey, entries);
        const key = `${lemma}|${role}`;
        const entry =
          entries.get(key) ??
          ({ lemma, role, pattern: patternOfLemma.get(lemma) ?? null, count: 0, forms: [], search: "" } as DictEntry);
        entries.set(key, entry);
        entry.count++;
        if (entry.forms.length < MAX_FORMS && !entry.forms.some((f) => f.ar === w.ar)) {
          entry.forms.push({
            ar: w.ar,
            m: {
              ur: fixOf(`${surah}:${ayah}:${w.p}`)?.ur ?? w.ur ?? "",
              en: fixOf(`${surah}:${ayah}:${w.p}`)?.en ?? w.en ?? "",
            },
            ref: `${surah}:${ayah}:${w.p}`,
            lesson: lesson.id,
            audio: asset(`/audio/words/${pad(surah)}_${pad(ayah)}_${pad(w.p)}.mp3`),
          });
        }
      }
    }
  }

  const collator = new Intl.Collator("ar");
  const groups: DictRoot[] = [...byRoot.entries()].map(([root, entries]) => ({
    root: root ? [...root].join(" ") : null,
    entries: [...entries.values()]
      .map((e) => ({
        ...e,
        search: normalize(
          [root, e.lemma, ...e.forms.flatMap((f) => [f.ar, f.m.ur, f.m.en])].join(" "),
        ),
      }))
      .sort((a, b) => b.count - a.count),
  }));
  // Roots in Arabic alphabetical order; words without a root at the end.
  return groups.sort((a, b) =>
    a.root === null ? 1 : b.root === null ? -1 : collator.compare(a.root, b.root),
  );
}
