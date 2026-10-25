import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLessonContent, lessons, t as tx } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";

// A working page for the owner and proofreaders: not linked from the
// navigation and kept out of search engines and the site search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReviewIndexPage({ params }: PageProps<"/[lang]/review">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = (await getDictionary(lang)).review;
  const text = lessons.filter((l) => l.format === "text");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold">{t.title}</h1>
        <p className="max-w-3xl text-muted">{t.intro}</p>
      </header>
      <section className="rounded-2xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-3 font-semibold">{t.lessons}</h2>
        <ul>
          {text.map((l) => {
            const c = getLessonContent(l.id)!;
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0">
                <Link href={`/${lang}/review/${l.id}/`} className="font-semibold hover:text-accent">
                  {l.id} · {tx(l.title, lang)}
                </Link>
                <span className="text-sm text-muted">
                  {t.slides}: {l.sourceSlides.from}–{l.sourceSlides.to} ·{" "}
                  <span className={c.status === "reviewed" ? "text-accent-2" : "text-accent"}>
                    {c.status === "reviewed" ? t.reviewed : t.draft}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-sm text-muted">{fill(t.slidesOnly, lang, { n: lessons.length - text.length })}</p>
    </div>
  );
}
