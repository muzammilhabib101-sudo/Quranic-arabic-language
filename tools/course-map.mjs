// Builds the proposed course map from the slide tags (npm run course-map).
//
// Input:  content/draft/slide-tags.txt   one line per slide:
//         n|type|surah:ayah|topic|key words
//         type: v = verse / translation, w = word breakdown, g = grammar rule, p = pattern (wazan)
// Output: content/course-map.json        units → lessons → slide ranges (for the site)
//         content/draft/course-map.md    readable report for approval
//
// Lessons follow the course itself: the slides teach one verse at a time,
// so each verse becomes a lesson, grouped into units by surah.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const surahs = JSON.parse(read("content/quran/surahs.json"));
const surahOf = (n) => surahs.find((s) => s.n === n);

// Al-Fatihah's whole-surah slides open and close its unit; they join the
// first and last verse lessons instead of being one-slide lessons.
const JOIN_LESSON = { 331: "1:2", 366: "1:7" };

const slides = read("content/draft/slide-tags.txt")
  .trim()
  .split("\n")
  .map((line) => {
    const [n, type, ref, topic, words] = line.split("|");
    return { n: +n, type, ref: JOIN_LESSON[n] ?? ref, topic, words: words ? words.split(" ") : [] };
  });

// Units in the order the slides teach them. `refs` lists the verse tags
// belonging to each unit; Al-Fatihah's opening overview tag is "1:1-7".
const UNITS = [
  {
    id: "u1",
    title: { ur: "بسم اللہ — پہلا قدم", en: "Bismillah — the first step" },
    description: {
      ur: "بسم اللہ کے ہر لفظ کا تجزیہ: ب، اسم، اللہ، اور وزن فَعْلان و فَعِیْل۔",
      en: "Every word of the Bismillah explained, with the patterns فَعْلان and فَعِیْل.",
    },
    surah: 1,
    match: (s) => s.ref === "1:1" && s.n <= 12,
  },
  {
    id: "u2",
    title: { ur: "سورۃ الحجرات", en: "Surah Al-Hujurat" },
    description: {
      ur: "سورۃ الحجرات کی ۱۸ آیات، لفظ بہ لفظ — ضمائر، فعل مضارع، امر، نفی اور اضافت۔",
      en: "All 18 verses of Al-Hujurat word by word — pronouns, present tense, commands, negation and idafa.",
    },
    surah: 49,
    match: (s) => s.ref.startsWith("49:"),
  },
  {
    id: "u3",
    title: { ur: "سورۃ الفاتحہ", en: "Surah Al-Fatihah" },
    description: {
      ur: "سورۃ الفاتحہ کی تمام آیات — حمد، رب، عبادت اور ہدایت کی دعا۔",
      en: "All of Al-Fatihah — praise, Lord, worship and the prayer for guidance.",
    },
    surah: 1,
    match: (s) => s.ref.startsWith("1:") && s.n > 12,
  },
  {
    id: "u4",
    title: { ur: "سورۃ الفرقان — عباد الرحمٰن", en: "Surah Al-Furqan — Servants of the Most Merciful" },
    description: {
      ur: "سورۃ الفرقان آیات ۶۱ تا ۷۷: رحمٰن کے بندوں کی صفات۔",
      en: "Al-Furqan 25:61–77: the qualities of the servants of the Most Merciful.",
    },
    surah: 25,
    match: (s) => s.ref.startsWith("25:"),
  },
];

const LESSON_TITLE = {
  "1:1": { ur: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ", en: "Bismillah" },
  "1:1-7": { ur: "سورۃ الفاتحہ — تعارف", en: "Al-Fatihah — overview" },
};

/** Minutes for a lesson: about 40 seconds per slide plus 3 for practice. */
const estMinutes = (count) => Math.max(5, Math.round((count * 40) / 60 / 5) * 5 + 3);

const units = [];
const lessons = [];
const problems = [];

for (const unit of UNITS) {
  const own = slides.filter(unit.match);
  // Consecutive slides with the same verse tag form one lesson.
  const groups = [];
  for (const s of own) {
    const last = groups.at(-1);
    if (last && last.ref === s.ref && last.slides.at(-1).n === s.n - 1) last.slides.push(s);
    else groups.push({ ref: s.ref, slides: [s] });
  }

  const lessonIds = [];
  groups.forEach((g, i) => {
    const id = `${unit.id}-l${i + 1}`;
    const [surah, ayahPart] = g.ref.split(":");
    const ayah = ayahPart.includes("-") ? null : +ayahPart;
    const surahInfo = surahOf(+surah);
    const verseRefs = ayah
      ? [{ surah: +surah, ayah }]
      : Array.from({ length: surahInfo.verses }, (_, k) => ({ surah: +surah, ayah: k + 1 }));

    const title =
      LESSON_TITLE[g.ref] ??
      { ur: `${surahInfo.meaning.ur === "افتتاحیہ" ? "الفاتحہ" : ""}آیت ${ayah}`, en: `Verse ${surah}:${ayah}` };

    const count = (t) => g.slides.filter((s) => s.type === t).length;
    const words = [...new Set(g.slides.flatMap((s) => s.words))];

    lessons.push({
      id,
      unitId: unit.id,
      order: i + 1,
      title,
      format: "slides",
      status: "draft",
      sourceSlides: { from: g.slides[0].n, to: g.slides.at(-1).n },
      verseRefs,
      estMinutes: estMinutes(g.slides.length),
      topics: g.slides.filter((s) => s.type === "g" || s.type === "p").map((s) => ({ n: s.n, type: s.type, text: s.topic })),
      keyWords: words.slice(0, 40),
      counts: { verse: count("v"), word: count("w"), grammar: count("g"), pattern: count("p") },
    });
    lessonIds.push(id);
  });

  units.push({ id: unit.id, order: units.length + 1, title: unit.title, description: unit.description, surah: unit.surah, lessonIds });
}

// Every slide must be in exactly one lesson, in order.
const covered = lessons.flatMap((l) => Array.from({ length: l.sourceSlides.to - l.sourceSlides.from + 1 }, (_, k) => l.sourceSlides.from + k));
if (covered.length !== slides.length) problems.push(`covered ${covered.length} of ${slides.length} slides`);
covered.forEach((n, i) => n !== i + 1 && problems.push(`slide order breaks at ${n}`));

// Readable titles: the verse's own Urdu label, e.g. "الحجرات ۱".
const urDigits = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
for (const l of lessons) {
  if (LESSON_TITLE[`${l.verseRefs[0].surah}:${l.verseRefs[0].ayah}`] && l.unitId === "u1") continue;
  if (l.verseRefs.length === 1) {
    const { surah, ayah } = l.verseRefs[0];
    const s = surahOf(surah);
    const arName = { 1: "الفاتحہ", 25: "الفرقان", 49: "الحجرات" }[surah] ?? s.ar;
    l.title = { ur: `${arName} — آیت ${urDigits(ayah)}`, en: `${s.en} ${surah}:${ayah}` };
  }
}

const map = { generated: "tools/course-map.mjs", status: "approved", units, lessons };
writeFileSync(join(ROOT, "content/course-map.json"), JSON.stringify(map, null, 1) + "\n");

// ---------- Report ----------
const quran = (s, a) => JSON.parse(read(`content/quran/words/${String(s).padStart(3, "0")}.json`))[a].q;
let md = `# Proposed course map\n\nGenerated from the tags of all ${slides.length} slides. Status: **approved** (2026-10-25).\n\n`;
md += `| Unit | Lessons | Slides | ~Time |\n|---|---|---|---|\n`;
for (const u of units) {
  const ls = lessons.filter((l) => l.unitId === u.id);
  md += `| ${u.order}. ${u.title.en} | ${ls.length} | ${ls[0].sourceSlides.from}–${ls.at(-1).sourceSlides.to} | ${ls.reduce((t, l) => t + l.estMinutes, 0)} min |\n`;
}
md += `| **Total** | **${lessons.length}** | **${slides.length}** | **${Math.round(lessons.reduce((t, l) => t + l.estMinutes, 0) / 60)} h** |\n\n`;
for (const u of units) {
  md += `## Unit ${u.order}: ${u.title.en} — ${u.title.ur}\n\n${u.description.en}\n\n`;
  md += `| # | Lesson | Slides | Teaches (grammar and patterns) |\n|---|---|---|---|\n`;
  for (const l of lessons.filter((x) => x.unitId === u.id)) {
    const teaches = l.topics.map((t) => t.text.split(/[;:(]/)[0].trim()).filter((t, i, a) => a.indexOf(t) === i).slice(0, 4).join("; ") || "word meanings";
    md += `| ${l.order} | ${l.title.en} | ${l.sourceSlides.from}–${l.sourceSlides.to} (${l.sourceSlides.to - l.sourceSlides.from + 1}) | ${teaches} |\n`;
  }
  md += `\n`;
}
md += `## Checks\n\n- Every slide belongs to exactly one lesson, in order: ${problems.length ? "**FAILED** — " + problems.join("; ") : "passed"}\n`;
md += `- Every verse reference exists in the Quran data: ${lessons.every((l) => l.verseRefs.every((r) => quran(r.surah, r.ayah))) ? "passed" : "**FAILED**"}\n`;
writeFileSync(join(ROOT, "content/draft/course-map.md"), md);

console.log(`${units.length} units, ${lessons.length} lessons; problems: ${problems.length}`);
if (problems.length) process.exit(1);
