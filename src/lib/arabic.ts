/**
 * Folds Arabic and Urdu text to bare letters so a search for رحيم also finds
 * رَحِيمٌ, ٱلرَّحِيمِ or رحیم: drops harakat, Quranic marks and tatweel, and
 * merges letter variants (alef forms, ya/alef maqsura, Urdu kaf/heh/yeh).
 * Latin text is lower-cased.
 */
export function normalize(text: string) {
  return text
    .normalize("NFC")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىیئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ک/g, "ك")
    .replace(/[ہھۃة]/g, "ه")
    .replace(/ء/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
