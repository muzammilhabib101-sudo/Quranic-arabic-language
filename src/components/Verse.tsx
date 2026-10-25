import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";

/** A verse in KFGQPC Hafs with its reference and translation. */
export default function Verse({
  lang,
  text,
  translation,
  surahName,
  surah,
  ayah,
  credit,
}: {
  lang: Locale;
  text: string;
  translation: string;
  surahName: string;
  surah: number;
  ayah: number;
  credit: string;
}) {
  return (
    <figure className="rounded-2xl border border-border bg-surface p-5 md:p-8">
      <blockquote
        lang="ar"
        className="quran mb-5 text-center text-[2rem] text-text md:text-[2.5rem]"
      >
        {text}
      </blockquote>
      <p className="mb-4 text-center text-lg">{translation}</p>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm text-muted">
        <span>
          {lang === "ur" ? (
            <span lang="ar" className="arabic">
              {surahName}
            </span>
          ) : (
            surahName
          )}{" "}
          {formatNumber(surah, lang)}:{formatNumber(ayah, lang)}
        </span>
        <span>{credit}</span>
      </figcaption>
    </figure>
  );
}
