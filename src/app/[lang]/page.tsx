import { notFound } from "next/navigation";
import { Barbell, BookOpenText, ChartLineUp } from "@phosphor-icons/react/ssr";
import Dashboard from "@/components/Dashboard";
import Mixed from "@/components/Mixed";
import { courseIndex } from "@/content/course";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

const features = [
  { key: "learn", Icon: BookOpenText },
  { key: "practice", Icon: Barbell },
  { key: "progress", Icon: ChartLineUp },
] as const;

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="mb-1 text-accent">{t.greeting}</p>
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{dict.site.tagline}</h1>
        <p className="max-w-2xl text-lg text-muted">{t.intro}</p>
      </header>

      <Dashboard lang={lang} index={courseIndex(lang)} t={t} />

      <section aria-labelledby="preview-title">
        <h2 id="preview-title" className="mb-4 text-xl font-semibold">
          {t.previewTitle}
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div
            dir="rtl"
            lang="ar"
            className="mb-5 flex flex-wrap items-center justify-center gap-4"
          >
            <span className="arabic rounded-xl border border-noun/40 bg-noun/10 px-5 py-1 text-4xl text-noun">
              رَحِيْمٌ
            </span>
            <span aria-hidden className="text-2xl text-muted">
              ←
            </span>
            <span className="arabic rounded-xl border border-border bg-surface-2 px-5 py-1 text-4xl">
              فَعِيْلٌ
            </span>
          </div>
          <div className="mb-4 flex flex-wrap justify-center gap-2 text-sm">
            <span className="rounded-full bg-noun/15 px-3 text-noun">{t.roles.noun}</span>
            <span className="rounded-full bg-surface-2 px-3 text-muted">
              {t.previewPattern}: <span lang="ar" className="arabic">فَعِيْلٌ</span>
            </span>
          </div>
          <p className="mx-auto max-w-2xl text-center text-muted">
            <Mixed text={t.previewBody} />
          </p>
        </div>
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="mb-4 text-xl font-semibold">
          {t.featuresTitle}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {features.map(({ key, Icon }) => (
            <li key={key} className="rounded-2xl border border-border bg-surface p-5">
              <Icon size={28} className="mb-3 text-accent-2" aria-hidden />
              <h3 className="mb-1 font-semibold">{t.features[key].title}</h3>
              <p className="text-sm text-muted">{t.features[key].body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
