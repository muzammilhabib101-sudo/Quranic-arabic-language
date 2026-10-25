import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SettingsPanel from "@/components/SettingsPanel";
import { lessons, t as tx } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/me">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.pages.me.title };
}

export default async function MePage({ params }: PageProps<"/[lang]/me">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold">{dict.pages.me.title}</h1>
        <p className="text-muted">{dict.pages.me.body}</p>
      </header>
      <SettingsPanel
        lang={lang}
        t={dict.me}
        lessonTitles={Object.fromEntries(lessons.map((l) => [l.id, tx(l.title, lang)]))}
      />
    </div>
  );
}
