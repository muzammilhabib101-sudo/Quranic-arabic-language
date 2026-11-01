import { describe, expect, it } from "vitest";
import { lessons } from "@/content/course";
import { practiceData } from "@/content/practice";
import { buildSet, makeItem, MIXED } from "@/lib/practice/generate";
import { EXERCISE_TYPES, itemWords, type Item } from "@/lib/practice/types";

const data = practiceData();
const all = data.words;
const langs = ["ur", "en"] as const;

/** Checks the rules every exercise must keep. */
function checkItem(item: Item) {
  if (item.kind === "choice") {
    expect(item.answer).toBeGreaterThanOrEqual(0);
    expect(item.answer).toBeLessThan(item.options.length);
    const keys = item.options.map((o) => o.ar ?? o.text);
    expect(new Set(keys).size, `${item.type} options repeat`).toBe(keys.length);
  }
  if (item.kind === "match") {
    // Each word's own meaning is on the board exactly once.
    expect([...item.meanings].sort()).toEqual(item.words.map((w) => w.m.ur.trim()).sort());
    expect(new Set(item.meanings).size).toBe(item.meanings.length);
  }
  if (item.kind === "translate") {
    // The learner orders meaning tiles; the Arabic run is shown as written in the verse.
    const verse = data.verses[item.words[0].verse].ids;
    const start = verse.indexOf(item.words[0].id);
    expect(item.words.map((w) => w.id)).toEqual(verse.slice(start, start + item.words.length));
  }
  if (item.kind === "choice" && item.context) {
    // A verse shown as context is the whole real verse, in order.
    expect(item.context.map((w) => w.id)).toEqual(data.verses[item.word.verse].ids);
  }
}

describe("practice data", () => {
  it("has every verse of every lesson, with well-formed words", () => {
    const verses = new Set(lessons.flatMap((l) => l.verseRefs.map((v) => `${v.surah}:${v.ayah}`)));
    expect(new Set(Object.keys(data.verses))).toEqual(verses);
    for (const w of all) {
      expect(w.id).toMatch(/^\d+:\d+:\d+$/);
      expect(w.audio).toMatch(/^\/audio\/words\/\d{3}_\d{3}_\d{3}\.mp3$/);
    }
  });

  it("applies meaning fixes over the downloaded data", () => {
    expect(all.find((w) => w.id === "25:68:17")?.m.ur).toBe("وہ زنا کرتے");
    expect(all.find((w) => w.id === "49:2:5")?.m.ur).toBe("تم سب بلند کرو");
  });
});

describe("exercises", () => {
  it("every exercise type can be made in both languages", () => {
    for (const lang of langs) {
      for (const type of EXERCISE_TYPES) {
        const item = all.map((w) => makeItem(type, w, all, data, lang)).find(Boolean);
        expect(item, `${type} (${lang})`).toBeTruthy();
      }
    }
  });

  it("every exercise made from every word keeps the rules", () => {
    for (const type of EXERCISE_TYPES) {
      for (const w of all) {
        const item = makeItem(type, w, all.filter((x) => x.lesson === w.lesson), data, "ur");
        if (item) checkItem(item);
      }
    }
  });

  it("every lesson has a practice set that repeats a word in a row only when nothing else fits", () => {
    for (const lesson of lessons) {
      const words = all.filter((w) => w.lesson === lesson.id);
      // Sets are shuffled, so try several.
      for (let run = 0; run < 20; run++) {
        const set = buildSet(words, MIXED, 9, data, "ur");
        expect(set.length, lesson.id).toBeGreaterThanOrEqual(Math.min(6, words.length));
        set.forEach(checkItem);
        for (let i = 1; i < set.length; i++) {
          const [a, b] = [itemWords(set[i - 1]), itemWords(set[i])];
          if (a.length !== 1 || b.length !== 1 || a[0].id !== b[0].id) continue;
          const others = words.filter((w) => w.id !== b[0].id && makeItem(set[i].type, w, words, data, "ur"));
          expect(others, `${lesson.id} item ${i} (${set[i].type})`).toEqual([]);
        }
      }
    }
  });
});
