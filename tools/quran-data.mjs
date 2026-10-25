// Downloads the verified Quran data the site is built from (npm run quran-data).
//
//   Tanzil.net (Uthmani)       → reference text for search and cross-checks
//                                                         content/quran/text.json
//   Quran.com API v4           → surah names              content/quran/surahs.json
//                              → KFGQPC Hafs text for display (matches the KFGQPC font),
//                                word-by-word en/ur, transliteration, verse translations
//   Quranic Arabic Corpus 0.4  → root, lemma, noun/verb/particle, word segments
//                                                         content/quran/words/NNN.json
//
// Raw downloads are cached in .cache/quran/ so re-runs are fast and offline.
// See content/quran/SOURCES.md for licences and attribution.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache", "quran");
const OUT = join(ROOT, "content", "quran");

const TANZIL_URL =
  "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=false&quranType=uthmani&outType=txt-2&agree=true";
const CORPUS_URL =
  "https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt";
const API = "https://api.quran.com/api/v4";

// Verse translations: Saheeh International (en), Fateh Muhammad Jalandhari (ur)
const TRANSLATIONS = { en: 20, ur: 234 };

async function cached(name, url) {
  const file = join(CACHE, name);
  if (existsSync(file)) return readFile(file, "utf8");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = await res.text();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body);
      return body;
    }
    if (attempt === 4) throw new Error(`${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

const json = async (name, url) => JSON.parse(await cached(name, url));

/** Runs `fn` over `items` with limited concurrency. */
async function pool(items, limit, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

// Base letters only, so two orthographies of the same verse can be compared:
// drops marks, verse numbers and spacing, and folds letter variants together.
const skeleton = (s) =>
  s
    .normalize("NFKD")
    .replace(/[^ء-غف-يٱ-ۓ]/g, "")
    .replace(/[آأإٱٲٳ]/g, "ا")
    .replace(/[یےى]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "");

const stripHtml = (s) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/g, "").replace(/<[^>]+>/g, "").trim();

// ---------- Tanzil ----------

async function tanzil() {
  const text = {};
  for (const line of (await cached("tanzil-uthmani.txt", TANZIL_URL)).split("\n")) {
    const m = line.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (m) text[`${m[1]}:${m[2]}`] = m[3].trim();
  }
  // Tanzil's file prefixes verse 1 of every surah (except 1 and 9) with the
  // Bismillah, which is not part of that verse.
  // Compared by letters, since 95:1 and 97:1 spell it with an extra shadda.
  const bismillah = skeleton(text["1:1"]);
  for (let s = 2; s <= 114; s++) {
    const words = text[`${s}:1`].split(" ");
    if (skeleton(words.slice(0, 4).join(" ")) === bismillah) {
      text[`${s}:1`] = words.slice(4).join(" ");
    }
  }
  const count = Object.keys(text).length;
  if (count !== 6236) throw new Error(`Tanzil: expected 6236 verses, got ${count}`);
  return text;
}

// ---------- Corpus morphology ----------

const ROLE = { N: "noun", V: "verb", P: "particle" };

async function morphology() {
  // key "s:a:w" → { root, lemma, role, seg: [{ t, pos, tags }] }
  const words = new Map();
  for (const line of (await cached("corpus-morphology.txt", CORPUS_URL)).split("\n")) {
    const [loc, form, pos, features = ""] = line.split("\t");
    if (!form) continue;
    const key = loc.split(":").slice(0, 3).join(":");
    const tags = features.split("|");
    const word = words.get(key) ?? { seg: [] };
    word.seg.push({ t: form, pos, tags: features });

    const isAffix = tags.includes("PREF") || tags.includes("SUFF");
    if (!isAffix) {
      word.role ??= ROLE[pos];
      for (const tag of tags) {
        if (tag.startsWith("ROOT:")) word.root ??= tag.slice(5);
        if (tag.startsWith("LEM:")) word.lemma ??= tag.slice(4);
      }
    }
    words.set(key, word);
  }
  return words;
}

// ---------- Quran.com ----------

async function chapters() {
  const [en, ur] = await Promise.all([
    json("chapters-en.json", `${API}/chapters?language=en`),
    json("chapters-ur.json", `${API}/chapters?language=ur`),
  ]);
  return en.chapters.map((c, i) => ({
    n: c.id,
    ar: c.name_arabic,
    en: c.name_simple,
    meaning: { en: c.translated_name.name, ur: ur.chapters[i].translated_name.name },
    verses: c.verses_count,
    place: c.revelation_place,
  }));
}

async function chapterVerses(n, lang) {
  const verses = [];
  for (let page = 1; ; page++) {
    const url =
      `${API}/verses/by_chapter/${n}?language=${lang}&words=true&word_fields=text_uthmani,text_qpc_hafs` +
      `&fields=text_qpc_hafs&translations=${TRANSLATIONS.en},${TRANSLATIONS.ur}&per_page=50&page=${page}`;
    const data = await json(`api-v2/${lang}/${n}-${page}.json`, url);
    verses.push(...data.verses);
    if (!data.pagination.next_page) return verses;
  }
}

// ---------- Build ----------

async function main() {
  const [text, morph, surahs] = await Promise.all([tanzil(), morphology(), chapters()]);
  await mkdir(join(OUT, "words"), { recursive: true });
  await writeFile(join(OUT, "text.json"), JSON.stringify(text) + "\n");
  await writeFile(join(OUT, "surahs.json"), JSON.stringify(surahs, null, 1) + "\n");

  const problems = [];
  let wordCount = 0;

  await pool(surahs, 4, async (surah) => {
    const [enVerses, urVerses] = await Promise.all([
      chapterVerses(surah.n, "en"),
      chapterVerses(surah.n, "ur"),
    ]);
    const out = {};
    enVerses.forEach((verse, vi) => {
      const key = verse.verse_key;
      const ayah = verse.verse_number;
      const urWords = urVerses[vi].words;
      const translation = (id) =>
        stripHtml(verse.translations.find((t) => t.resource_id === id)?.text ?? "");

      const words = verse.words
        .filter((w) => w.char_type_name === "word")
        .map((w, wi) => {
          const m = morph.get(`${key}:${w.position}`);
          if (!m) problems.push(`${key}:${w.position} has no corpus entry`);
          return {
            p: w.position,
            ar: w.text_qpc_hafs,
            u: w.text_uthmani,
            tl: w.transliteration?.text ?? null,
            en: w.translation?.text ?? null,
            ur: urWords.filter((u) => u.char_type_name === "word")[wi]?.translation?.text ?? null,
            role: m?.role ?? null,
            root: m?.root ?? null,
            lemma: m?.lemma ?? null,
            seg: m?.seg ?? [],
          };
        });

      if (!morph.has(`${key}:${words.length}`) || morph.has(`${key}:${words.length + 1}`)) {
        problems.push(`${key}: word count differs between Quran.com and the Corpus`);
      }
      if (skeleton(verse.text_qpc_hafs) !== skeleton(text[key])) {
        problems.push(`${key}: KFGQPC and Tanzil letters differ`);
      }
      wordCount += words.length;
      out[ayah] = { q: verse.text_qpc_hafs, t: { en: translation(TRANSLATIONS.en), ur: translation(TRANSLATIONS.ur) }, w: words };
    });

    if (Object.keys(out).length !== surah.verses) {
      problems.push(`Surah ${surah.n}: expected ${surah.verses} verses`);
    }
    const file = join(OUT, "words", `${String(surah.n).padStart(3, "0")}.json`);
    await writeFile(file, JSON.stringify(out) + "\n");
    process.stdout.write(".");
  });

  console.log(`\n${Object.keys(text).length} verses, ${wordCount} words, ${surahs.length} surahs`);
  await writeFile(join(OUT, "problems.txt"), problems.join("\n") + "\n");
  console.log(`${problems.length} problems (see content/quran/problems.txt)`);
}

await main();
