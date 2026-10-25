import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import map from "@content/course-map.json";
import { getLessonContent, getVerseWords, lessonOfSlide, lessons, units } from "@/content/course";
import { slideCount } from "@/content/slides";
import { checkLesson } from "../../tools/check-arabic.mjs";

const lessonFiles = readdirSync("content/lessons").filter((f) => f.endsWith(".json"));

describe("course map", () => {
  it("is approved", () => {
    expect(map.status).toBe("approved");
  });

  it("covers every slide exactly once, in order", () => {
    const sorted = [...lessons].sort((a, b) => a.sourceSlides.from - b.sourceSlides.from);
    expect(sorted[0].sourceSlides.from).toBe(1);
    expect(sorted.at(-1)!.sourceSlides.to).toBe(slideCount);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].sourceSlides.from).toBe(sorted[i - 1].sourceSlides.to + 1);
    }
    for (let n = 1; n <= slideCount; n++) expect(lessonOfSlide(n), `slide ${n}`).toBeDefined();
  });

  it("lists each lesson in exactly one unit", () => {
    const listed = units.flatMap((u) => u.lessonIds).sort();
    expect(listed).toEqual(lessons.map((l) => l.id).sort());
    for (const l of lessons) expect(units.find((u) => u.id === l.unitId)?.lessonIds).toContain(l.id);
  });
});

describe("text lessons", () => {
  it("every lesson file belongs to a lesson in the course map", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const f of lessonFiles) expect(ids, f).toContain(f.replace(/\.json$/, ""));
  });

  for (const file of lessonFiles) {
    const id = file.replace(/\.json$/, "");
    describe(id, () => {
      const lesson = getLessonContent(id)!;
      const verse = getVerseWords(lesson.verse.surah, lesson.verse.ayah);

      it("is a verse from the lesson's own slides", () => {
        const refs = lessons.find((l) => l.id === id)!.verseRefs;
        expect(refs).toContainEqual(lesson.verse);
      });

      it("explains every word of the verse once, in order", () => {
        expect(lesson.words.map((w) => w.position)).toEqual(verse.map((w) => w.p));
      });

      it("connects words that exist in the verse", () => {
        for (const block of lesson.connect.flow) {
          for (const p of block.words ?? []) expect(p).toBeLessThanOrEqual(verse.length);
        }
      });

      it("has quick-check answers that point at a real option, each with an explanation", () => {
        for (const q of lesson.check) {
          expect(q.answer, q.id).toBeLessThan(q.options.length);
          expect(q.explanation.ur.length, q.id).toBeGreaterThan(0);
        }
        expect(new Set(lesson.check.map((q) => q.id)).size).toBe(lesson.check.length);
      });

      it("types verse words with the verse's own vowels", () => {
        const { mismatches } = checkLesson(lesson);
        expect(mismatches).toEqual([]);
      });
    });
  }
});
