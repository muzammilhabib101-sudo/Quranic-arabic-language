import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProgressView from "@/components/ProgressView";
import { courseIndex } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/progress">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.pages.progress.title };
}

export default async function ProgressPage({
  params,
}: PageProps<"/[lang]/progress">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold">{dict.pages.progress.title}</h1>
        <p className="text-muted">{dict.pages.progress.body}</p>
      </header>
      <ProgressView lang={lang} index={courseIndex(lang)} t={dict.progress} />
    </div>
  );
}
