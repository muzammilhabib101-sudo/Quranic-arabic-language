// Checks the Arabic typed into lesson files against the verified Quran text
// (npm run check-arabic). Lessons quote words of their verse in explanations
// and word parts; a wrong vowel there would teach the Quran wrongly.
//
// For every vowelled Arabic word in a lesson, it looks for a word or Corpus
// segment of the lesson's verse with the same letters. If one is found, the
// vowels are compared letter by letter:
//   - only fatha, damma, kasra, shadda and tanween are compared, and the
//     standing alif (ٰ) counts as a fatha;
//   - alif is ignored (اللّٰه and ٱللَّه, يَا and يَٰٓ are spelled differently
//     in Indo-Pak and Uthmani script), as are sukun and missing marks — so و
//     and ي are compared only where they carry a vowel of their own;
//   - a shadda on the first letter is not compared (sun letters after ال);
//   - the last letter is not compared: lessons cite base forms (آمَنَ, اتَّقِ)
//     whose ending differs from the inflected word in the verse.
// Words not in the verse (examples like أَكْتُبُ) are listed for the reviewer.
// Exits with code 1 when a mismatch is found.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalize } from "../src/lib/arabic.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf8"));
const pad = (n) => String(n).padStart(3, "0");

/** Pattern templates used in lessons: the taught patterns plus the verb forms. */
const PATTERN_NAMES = new Set([
  ...Object.values(read("content", "practice", "patterns.json").patterns).map((p) => p.ar),
  "فَعَلَ", "فَعَّلَ", "فُعِلَ", "يُفْعَلُ", "افْتَعَلَ", "فَعِيل", "فَعْلَان",
]);

const MARK = /[ً-ّ]/; // tanween, fatha, damma, kasra, shadda
const LETTER = /[ء-يٱ-ۓ]/;
const FATHA = "َ";

/** Letters (folded, alif left out) with the marks that sit on each. */
function letters(word) {
  const out = [];
  let cur = null;
  for (const ch of word.normalize("NFC")) {
    if (ch === "ٰ") {
      // Uthmani writes the standing alif on a final ى (عَلَىٰ); Indo-Pak on the
      // letter before it (عَلٰى). Both mean a long a on that earlier letter.
      const owner = cur?.l === "ي" && out.length > 1 && cur === out.at(-1) ? out.at(-2) : cur;
      if (owner) {
        owner.m.add(FATHA);
        owner.long = true;
      }
    } else if (LETTER.test(ch)) {
      const l = normalize(ch);
      // An alif after a letter makes its vowel long (قَاتِل, not قَتَل).
      if (l === "ا" && out.length) out.at(-1).long = true;
      // Alif and hamza carry no comparable vowel; their marks are dropped.
      cur = l && l !== "ا" ? { l, m: new Set(), long: false } : null;
      if (cur) out.push(cur);
    } else if (MARK.test(ch)) {
      cur?.m.add(ch);
    }
  }
  return out;
}

const skeleton = (word) => letters(word).map((x) => x.l).join("");

const NAMES = {
  "ً": "fathatan", "ٌ": "dammatan", "ٍ": "kasratan",
  "َ": "fatha", "ُ": "damma", "ِ": "kasra", "ّ": "shadda",
};
const show = (set) => [...set].map((m) => NAMES[m]).join("+");

/** Differences between a typed word and the verified one; [] when they agree. */
export function compare(typed, verified) {
  const a = letters(typed);
  const b = letters(verified);
  if (a.length !== b.length) return null;
  // A long vowel inside the word makes it a different word (قَتَلَ vs قَاتِلُ),
  // not a misspelling, so the pair isn't compared. The last letter is skipped
  // because base forms and inflected verse words end differently.
  // (Indo-Pak writes the name of Allah اللّٰه with a standing alif; Uthmani doesn't.)
  const isAllah = skeleton(typed).includes("لله");
  // A final ى already marks a long a, so the letter before it is not compared.
  const longDiffers = (x, i) => x.long !== b[i].long && a[i + 1]?.l !== "ي";
  if (!isAllah && a.slice(0, -1).some(longDiffers)) return null;
  const diffs = [];
  a.forEach((x, i) => {
    const y = b[i];
    if (x.l !== y.l) diffs.push(`letter ${i + 1}: ${x.l} ≠ ${y.l}`);
    if (i === a.length - 1 || !x.m.size || !y.m.size) return;
    // A sun letter after ال doubles (ٱلرَّحِيم); cited alone it doesn't (رَحِيْم).
    const drop = (m) => [...m].filter((c) => !(i === 0 && c === "ّ")).sort().join("");
    const xs = drop(x.m);
    const ys = drop(y.m);
    if (xs !== ys) diffs.push(`letter ${i + 1} (${x.l}): ${show(x.m)} ≠ ${show(y.m)}`);
  });
  return diffs;
}

/** Every string in a lesson file, with its JSON path. */
function strings(node, path = "") {
  if (typeof node === "string") return [{ path, text: node }];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
}

const VOWELLED = /[ء-ۓً-ْٰ]*[ً-ّ][ء-ۓً-ْٰ]*/g;

export function checkLesson(lesson) {
  const { surah, ayah } = lesson.verse;
  const verse = read("content", "quran", "words", `${pad(surah)}.json`)[ayah].w;
  // Whole words and every run of their Corpus segments, so رَسُولِ and
  // ٱتَّقُوا (without the وَ of وَرَسُولِهِۦ, وَٱتَّقُوا۟) are found too.
  const refs = verse.flatMap((w) => {
    const segs = w.seg.map((s) => s.t);
    const runs = [w.u];
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j <= segs.length; j++) runs.push(segs.slice(i, j).join(""));
    return runs;
  });
  const URDU = /[ہیکےںٹڈڑھۓ]/;

  const mismatches = [];
  const unmatched = new Set();
  let checked = 0;
  for (const { path, text } of strings(lesson)) {
    for (const token of text.match(VOWELLED) ?? []) {
      // Urdu words, including izafat like حروفِ (a lone final kasra), are not Arabic quotes.
      if (URDU.test(token) || /^[^ً-ّ]*ِ$/.test(token)) continue;
      // Pattern names (فَاعِل، فَعِيْل…) are templates built on ف ع ل, not quotes;
      // without this, فَاعِل would be compared with a verse word like فَعَلْتُمْ.
      if (path.endsWith(".pattern") || PATTERN_NAMES.has(token)) {
        unmatched.add(token);
        continue;
      }
      const key = skeleton(token);
      const same = refs.filter((r) => skeleton(r) === key);
      if (!same.length) {
        unmatched.add(token);
        continue;
      }
      const results = same.map((r) => ({ r, d: compare(token, r) })).filter((x) => x.d);
      if (!results.length) {
        unmatched.add(token);
        continue;
      }
      checked++;
      // Fine if it agrees with any verified spelling of those letters.
      if (results.length && results.every((x) => x.d.length)) {
        mismatches.push({ path, token, verified: results[0].r, diffs: results[0].d });
      }
    }
  }
  return { checked, mismatches, unmatched: [...unmatched] };
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let failed = 0;
  let examples = 0;
  for (const file of readdirSync(join(ROOT, "content", "lessons")).filter((f) => f.endsWith(".json"))) {
    const lesson = read("content", "lessons", file);
    const r = checkLesson(lesson);
    const ref = `${lesson.verse.surah}:${lesson.verse.ayah}`;
    if (r.mismatches.length) {
      console.log(`✗ ${lesson.id}: ${r.mismatches.length} of ${r.checked} quoted words differ from verse ${ref}`);
      for (const m of r.mismatches) {
        console.log(`    ${m.path}: «${m.token}» vs verified «${m.verified}» — ${m.diffs.join("; ")}`);
      }
      failed += r.mismatches.length;
    } else {
      console.log(`✓ ${lesson.id}: all ${r.checked} quoted words match verse ${ref}`);
    }
    examples += r.unmatched.length;
  }
  console.log(
    failed
      ? `\nProblems found: ${failed}. Fix the words marked ✗ above.`
      : `\nNo problems found.` +
          (examples
            ? ` (Note: ${examples} grammar examples and patterns are not from the verses, so they can't be checked automatically — they are listed for a teacher in content/draft/review-report.md. This is not an error.)`
            : ""),
  );
  process.exit(failed ? 1 : 0);
}
