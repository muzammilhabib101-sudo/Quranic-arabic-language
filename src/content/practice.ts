import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import patternFile from "@content/practice/patterns.json";
import meaningFixes from "@content/quran/meaning-fixes.json";
import type { PracticeData, PracticeWord, SegKind } from "@/lib/practice/types";
import { asset } from "@/lib/base-path";
import { lessons } from "./course";

type CorpusSeg = { t: string; pos: string; tags: string };
type RawWord = {
  p: number;
  ar: string;
  tl: string | null;
  en: string | null;
  ur: string | null;
  role: "noun" | "verb" | "particle" | null;
  root: string | null;
  lemma: string | null;
  seg: CorpusSeg[];
};
type RawVerse = { t: { en: string; ur: string }; w: RawWord[] };

const pad = (n: number) => String(n).padStart(3, "0");
const files = new Map<number, Record<string, RawVerse>>();
function verse(surah: number, ayah: number): RawVerse {
  if (!files.has(surah)) {
    const path = join(process.cwd(), "content", "quran", "words", `${pad(surah)}.json`);
    files.set(surah, JSON.parse(readFileSync(path, "utf8")));
  }
  return files.get(surah)![ayah];
}

const patternOfLemma = new Map<string, string>();
for (const [key, p] of Object.entries(patternFile.patterns)) {
  for (const lemma of p.lemmas) patternOfLemma.set(lemma, key);
}

function segKind(tags: string): SegKind {
  const list = tags.split("|");
  if (list.includes("PREF")) return "pre";
  if (list.includes("SUFF")) return "suf";
  return "stem";
}

/** "PRON|SUFF|3MP" → "3MP"; "LEM:ب" → "ب". */
function segInfo(tags: string) {
  const list = tags.split("|");
  return {
    person: list.find((t) => /^[123][MF]?[SDP]$/.test(t)) ?? null,
    lemma: list.find((t) => t.startsWith("LEM:"))?.slice(4) ?? null,
    pron: list.includes("PRON"),
  };
}

/**
 * Every word of every verse in the course, with what practice needs:
 * meanings, root, role, parts, pattern and audio. Built once per build and
 * served as /data/practice.json.
 */
export function practiceData(): PracticeData {
  const words: PracticeWord[] = [];
  const verses: PracticeData["verses"] = {};

  for (const lesson of lessons) {
    for (const { surah, ayah } of lesson.verseRefs) {
      const key = `${surah}:${ayah}`;
      if (verses[key]) continue;
      const v = verse(surah, ayah);
      const ids: string[] = [];
      v.w.forEach((w, i) => {
        const id = `${key}:${w.p}`;
        const fix = (meaningFixes.fixes as Record<string, { ur?: string; en?: string }>)[id];
        ids.push(id);
        // Quran.com sometimes gives one meaning to a run of words
        // ("O you who believe"); those can't be asked about one by one.
        const grouped =
          (!!w.en && (w.en === v.w[i - 1]?.en || w.en === v.w[i + 1]?.en)) ||
          (!!w.ur && (w.ur === v.w[i - 1]?.ur || w.ur === v.w[i + 1]?.ur));
        words.push({
          id,
          verse: key,
          ar: w.ar,
          tl: w.tl,
          m: { ur: fix?.ur ?? w.ur ?? "", en: fix?.en ?? w.en ?? "" },
          role: w.role ?? "particle",
          root: w.root ? [...w.root].join(" ") : null,
          pattern: (w.lemma && patternOfLemma.get(w.lemma)) ?? null,
          segs:
            w.seg.length > 1
              ? w.seg.map((s) => ({ t: s.t, k: segKind(s.tags), ...segInfo(s.tags) }))
              : null,
          grouped,
          lesson: lesson.id,
          unit: lesson.unitId,
          audio: asset(`/audio/words/${pad(surah)}_${pad(ayah)}_${pad(w.p)}.mp3`),
        });
      });
      verses[key] = { ids, t: v.t, lesson: lesson.id };
    }
  }

  const patterns: PracticeData["patterns"] = Object.fromEntries(
    Object.entries(patternFile.patterns).map(([k, p]) => [k, { ar: p.ar, meaning: p.meaning, slide: p.slide }]),
  );

  return { words, verses, patterns };
}
