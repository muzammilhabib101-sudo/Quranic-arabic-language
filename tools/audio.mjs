// Downloads recitation audio (npm run audio).
//
//   Verse:  Mishary Rashid Alafasy, 128 kbps (EveryAyah.com)  → public/audio/verses/SSSAAA.mp3
//           for every text lesson
//   Words:  word-by-word recitation (Quran.com)               → public/audio/words/SSS_AAA_WWW.mp3
//           for every word of every verse in the course (used by "listen" practice)
//
// Files are served from the site itself, so visitors never contact an audio
// server. Existing files are skipped. Only real recitations — never TTS.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "audio");
const VERSE_URL = (s, a) => `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
const WORD_URL = (s, a, w) => `https://audio.qurancdn.com/wbw/${s}_${a}_${w}.mp3`;

const pad = (n) => String(n).padStart(3, "0");

async function download(url, file) {
  if (existsSync(file)) return false;
  const res = await fetch(url);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("audio/")) throw new Error(`${res.status} ${type} for ${url}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf8"));
const lessonDir = join(ROOT, "content", "lessons");
const textLessons = readdirSync(lessonDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => read("content", "lessons", f));
const courseVerses = read("content", "course-map.json").lessons.flatMap((l) => l.verseRefs);

let fetched = 0;
for (const { surah, ayah } of textLessons.map((l) => l.verse)) {
  if (await download(VERSE_URL(pad(surah), pad(ayah)), join(OUT, "verses", `${pad(surah)}${pad(ayah)}.mp3`))) fetched++;
}

for (const { surah, ayah } of courseVerses) {
  const s = pad(surah);
  const a = pad(ayah);
  const words = read("content", "quran", "words", `${s}.json`)[ayah].w;
  for (const w of words) {
    if (await download(WORD_URL(s, a, pad(w.p)), join(OUT, "words", `${s}_${a}_${pad(w.p)}.mp3`))) fetched++;
  }
  process.stdout.write(".");
}
console.log(`
${fetched} new audio files`);
