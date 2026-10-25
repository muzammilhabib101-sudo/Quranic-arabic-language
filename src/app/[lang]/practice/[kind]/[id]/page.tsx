import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PracticeSession, { type SessionKind } from "@/components/practice/PracticeSession";
import { getLesson, getUnit, lessons, t as tx, units } from "@/content/course";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { EXERCISE_TYPES, type ExerciseType } from "@/lib/practice/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...lessons.map((l) => ({ kind: "lesson", id: l.id })),
    ...units.map((u) => ({ kind: "unit", id: u.id })),
    ...EXERCISE_TYPES.map((type) => ({ kind: "mode", id: type })),
    { kind: "review", id: "today" },
  ];
}

function titleOf(kind: string, id: string, lang: Locale, t: Dictionary["practice"]) {
  if (kind === "lesson") {
    const l = getLesson(id);
    return l ? `${t.practiseLesson}: ${tx(l.title, lang)}` : null;
  }
  if (kind === "unit") {
    const u = getUnit(id);
    return u ? `${t.unitReview}: ${tx(u.title, lang)}` : null;
  }
  if (kind === "mode") {
    return (EXERCISE_TYPES as readonly string[]).includes(id) ? t.types[id as ExerciseType].name : null;
  }
  if (kind === "review" && id === "today") return t.today;
  return null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/practice/[kind]/[id]">): Promise<Metadata> {
  const { lang, kind, id } = await params;
  if (!hasLocale(lang)) return {};
  const title = titleOf(kind, id, lang, (await getDictionary(lang)).practice);
  return title ? { title } : {};
}

export default async function PracticeSessionPage({
  params,
}: PageProps<"/[lang]/practice/[kind]/[id]">) {
  const { lang, kind, id } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const title = titleOf(kind, id, lang, dict.practice);
  if (!title) notFound();

  return (
    <PracticeSession
      lang={lang}
      kind={kind as SessionKind}
      id={id}
      title={title}
      t={dict.practice}
      roles={dict.home.roles}
    />
  );
}
