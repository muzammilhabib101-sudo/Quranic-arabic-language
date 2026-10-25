import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTENT_AUTHOR } from "@/content/credits";
import { hasLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";

type ItemKey = keyof Dictionary["credits"]["items"];
type Source = { name?: string; url?: string; item: ItemKey };

// Names stay as their owners write them; the descriptions are translated.
// Keep in step with content/quran/SOURCES.md.
const SECTIONS: { key: keyof Dictionary["credits"]["sections"]; sources: Source[] }[] = [
  { key: "course", sources: [{ name: CONTENT_AUTHOR, item: "contentAuthor" }, { item: "course" }] },
  {
    key: "quran",
    sources: [
      { name: "King Fahd Glorious Quran Printing Complex", url: "https://qurancomplex.gov.sa", item: "kfgqpc" },
      { name: "Tanzil", url: "https://tanzil.net", item: "tanzil" },
    ],
  },
  {
    key: "meanings",
    sources: [
      { name: "Quran.com", url: "https://quran.com", item: "quranCom" },
      { name: "Saheeh International", item: "saheeh" },
      { name: "Fateh Muhammad Jalandhari", item: "jalandhari" },
    ],
  },
  {
    key: "grammar",
    sources: [{ name: "Quranic Arabic Corpus", url: "https://corpus.quran.com", item: "corpus" }],
  },
  {
    key: "audio",
    sources: [
      { name: "Mishary Rashid Alafasy · EveryAyah", url: "https://everyayah.com", item: "alafasy" },
      { name: "Quran.com", url: "https://quran.com", item: "quranCom" },
    ],
  },
  {
    key: "fonts",
    sources: [
      { name: "KFGQPC Uthmanic Script Hafs", item: "hafsFont" },
      { name: "Google Fonts", url: "https://fonts.google.com", item: "otherFonts" },
    ],
  },
  { key: "software", sources: [{ item: "software" }] },
];

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/credits">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.credits.title };
}

export default async function CreditsPage({ params }: PageProps<"/[lang]/credits">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = (await getDictionary(lang)).credits;

  return (
    <div className="flex flex-col gap-6" data-pagefind-body>
      <header>
        <h1 className="mb-2 text-3xl font-bold" data-pagefind-meta="title">
          {t.title}
        </h1>
        <p className="max-w-3xl text-muted">{t.intro}</p>
      </header>
      {SECTIONS.map((section) => (
        <section key={section.key} className="rounded-2xl border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 font-semibold">{t.sections[section.key]}</h2>
          <ul>
            {section.sources.map((s) => (
              <li key={s.item} className="border-b border-border px-5 py-4 last:border-b-0">
                {s.name && (
                  <p className="mb-1 font-semibold">
                    <bdi>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={fill(t.visit, lang, { name: s.name })}
                          className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
                        >
                          {s.name}
                        </a>
                      ) : (
                        s.name
                      )}
                    </bdi>
                  </p>
                )}
                <p className="text-muted">{t.items[s.item]}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="max-w-3xl text-muted">{t.mistakes}</p>
    </div>
  );
}
