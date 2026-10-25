import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PracticeHub from "@/components/practice/PracticeHub";
import { courseIndex } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/practice">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.pages.practice.title };
}

export default async function PracticePage({ params }: PageProps<"/[lang]/practice">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold">{dict.pages.practice.title}</h1>
        <p className="max-w-2xl text-muted">{dict.practice.hubIntro}</p>
      </header>
      <PracticeHub lang={lang} index={courseIndex(lang)} t={dict.practice} />
    </div>
  );
}
