import type { Metadata } from "next";
import { notFound } from "next/navigation";
import patternFile from "@content/practice/patterns.json";
import DictionaryView from "@/components/DictionaryView";
import { dictionary } from "@/content/dictionary";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/words">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.pages.words.title };
}

export default async function WordsPage({ params }: PageProps<"/[lang]/words">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const groups = dictionary();
  const entries = groups.reduce((n, g) => n + g.entries.length, 0);
  const roots = groups.filter((g) => g.root).length;
  const patterns = Object.entries(patternFile.patterns).map(([key, p]) => ({ key, ar: p.ar }));

  return (
    <div className="flex flex-col gap-6" data-pagefind-body>
      <header>
        <h1 className="mb-2 text-3xl font-bold" data-pagefind-meta="title">
          {dict.pages.words.title}
        </h1>
        <p className="max-w-2xl text-muted">{fill(dict.words.intro, lang, { entries, roots })}</p>
      </header>
      <DictionaryView lang={lang} groups={groups} patterns={patterns} t={dict.words} roles={dict.home.roles} />
    </div>
  );
}
