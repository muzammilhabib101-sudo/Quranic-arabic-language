import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SearchView from "@/components/SearchView";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.search.title };
}

export default async function SearchPage({ params }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{dict.search.title}</h1>
      <SearchView lang={lang} t={dict.search} />
    </div>
  );
}
