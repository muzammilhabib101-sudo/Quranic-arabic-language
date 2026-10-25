import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseList from "@/components/CourseList";
import { courseIndex, lessons } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/course">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.pages.course.title };
}

export default async function CoursePage({
  params,
}: PageProps<"/[lang]/course">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold">{dict.pages.course.title}</h1>
        <p className="max-w-2xl text-muted">
          {fill(dict.course.intro, lang, { lessons: lessons.length })}
        </p>
      </header>
      <CourseList lang={lang} index={courseIndex(lang)} t={dict.course} />
    </div>
  );
}
