import { beforeEach, describe, expect, it } from "vitest";
import { daysUntil, dueIds, newCard, Rating, review } from "@/lib/practice/srs";
import { lessonPercent, streak, today, useStore } from "@/lib/store";

const word = { id: "1:1:2", ar: "ٱللَّهِ", meaning: { ur: "اللہ", en: "Allah" }, lessonId: "u1-l1" };

beforeEach(() => {
  localStorage.clear();
  useStore.getState().resetProgress();
});

describe("spaced repetition", () => {
  const now = new Date("2026-10-25T10:00:00Z");

  it("a new card is due straight away", () => {
    expect(dueIds({ a: newCard(now) }, now)).toEqual(["a"]);
  });

  it("a good answer moves a word later than a wrong one", () => {
    const good = review(undefined, Rating.Good, now);
    const again = review(undefined, Rating.Again, now);
    expect(Date.parse(good.due)).toBeGreaterThan(Date.parse(again.due));
    expect(good.reps).toBe(1);
  });

  it("lists due cards oldest first and skips future ones", () => {
    const cards = {
      later: { ...newCard(now), due: "2026-10-30T00:00:00.000Z" },
      old: { ...newCard(now), due: "2026-10-01T00:00:00.000Z" },
      recent: { ...newCard(now), due: "2026-10-20T00:00:00.000Z" },
    };
    expect(dueIds(cards, now)).toEqual(["old", "recent"]);
  });

  it("counts whole days until due, never below zero", () => {
    expect(daysUntil("2026-10-20T00:00:00.000Z", now)).toBe(0);
    expect(daysUntil(new Date(2026, 9, 28, 12).toISOString(), new Date(2026, 9, 25, 9))).toBe(3);
  });
});

describe("saved words", () => {
  it("saving a word puts it in the review queue", () => {
    useStore.getState().toggleWord(word);
    const s = useStore.getState();
    expect(s.savedWords.map((w) => w.id)).toEqual(["1:1:2"]);
    expect(dueIds(s.cards)).toContain("1:1:2");
  });

  it("unsaving keeps the word's review history", () => {
    useStore.getState().toggleWord(word);
    useStore.getState().rate(word.id, Rating.Good);
    const card = useStore.getState().cards[word.id];
    useStore.getState().toggleWord(word);
    expect(useStore.getState().savedWords).toEqual([]);
    expect(useStore.getState().cards[word.id]).toEqual(card);
  });

  it("saving again does not reset a word already being reviewed", () => {
    useStore.getState().answer([word.id], "u1", true);
    const card = useStore.getState().cards[word.id];
    useStore.getState().toggleWord(word);
    expect(useStore.getState().cards[word.id]).toEqual(card);
  });
});

describe("progress", () => {
  it("records steps, finishing and the day studied", () => {
    const st = useStore.getState();
    st.reachStep("u1-l1", 3, 6);
    expect(lessonPercent(useStore.getState().lessons["u1-l1"], 10)).toBe(50);
    st.completeLesson("u1-l1");
    expect(lessonPercent(useStore.getState().lessons["u1-l1"], 10)).toBe(100);
    expect(useStore.getState().activeDays).toEqual([today()]);
  });

  it("a slides lesson finishes when every slide has been seen", () => {
    const st = useStore.getState();
    st.viewSlide(1, "u1-l1", 2);
    expect(useStore.getState().lessons["u1-l1"].done).toBeUndefined();
    st.viewSlide(2, "u1-l1", 2);
    expect(useStore.getState().lessons["u1-l1"].done).toBe(today());
  });

  it("counts a streak that ends today or yesterday", () => {
    const now = new Date(2026, 9, 25, 12);
    expect(streak(["2026-10-23", "2026-10-24", "2026-10-25"], now)).toBe(3);
    expect(streak(["2026-10-23", "2026-10-24"], now)).toBe(2);
    expect(streak(["2026-10-22"], now)).toBe(0);
  });

  it("practice answers are counted, wrong ones without penalty", () => {
    const st = useStore.getState();
    st.answer(["1:1:1"], "u1", true);
    st.answer(["1:1:2"], "u1", false);
    const p = useStore.getState().practice;
    expect(p).toMatchObject({ answered: 2, correct: 1, units: { u1: { answered: 2, correct: 1 } } });
  });
});

describe("backup import", () => {
  it("rejects files that are not a backup", () => {
    expect(useStore.getState().importData(null)).toBe(false);
    expect(useStore.getState().importData({ hello: 1 })).toBe(false);
    expect(useStore.getState().importData({ lessons: {}, activeDays: "x" })).toBe(false);
  });

  it("keeps good data and drops malformed parts", () => {
    const ok = useStore.getState().importData({
      lessons: { "u1-l1": { seen: [1, "x", 2], step: 2, steps: 6 } },
      activeDays: ["2026-10-24", 5],
      savedWords: [word, { id: 1 }],
      cards: { a: newCard(), b: { due: "not a date" } },
      practice: { answered: "lots" },
    });
    expect(ok).toBe(true);
    const s = useStore.getState();
    expect(s.lessons["u1-l1"]).toEqual({ seen: [1, 2], step: 2, steps: 6 });
    expect(s.activeDays).toEqual(["2026-10-24"]);
    expect(s.savedWords).toEqual([word]);
    expect(Object.keys(s.cards)).toEqual(["a"]);
    expect(s.practice.answered).toBe(0);
  });

  it("reset clears progress but keeps comfort settings", () => {
    const st = useStore.getState();
    st.setSetting("largeText", true);
    st.toggleWord(word);
    st.resetProgress();
    const s = useStore.getState();
    expect(s.savedWords).toEqual([]);
    expect(s.cards).toEqual({});
    expect(s.settings.largeText).toBe(true);
  });
});
