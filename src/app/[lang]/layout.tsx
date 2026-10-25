import "../globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fontVariables } from "@/app/fonts";
import { dirOf, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import SiteHeader from "@/components/SiteHeader";
import BottomNav from "@/components/BottomNav";
import SettingsEffect, { settingsScript } from "@/components/SettingsEffect";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#0f1115",
  colorScheme: "dark",
};

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dirOf(lang)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        {/* First in <body>, not <head>: a hand-written <head> script made
            hydration fail intermittently. Runs before paint either way. */}
        <script dangerouslySetInnerHTML={{ __html: settingsScript }} />
        <SettingsEffect />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          {dict.site.skipToContent}
        </a>
        <SiteHeader lang={lang} dict={dict} />
        <main
          id="main"
          className="mx-auto w-full max-w-5xl px-4 pt-6 pb-10 md:px-6 md:pb-12"
        >
          {children}
        </main>
        {/* Bottom padding clears the fixed bottom navigation on phones. */}
        <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 border-t border-border px-4 pt-2 pb-28 text-sm text-muted md:px-6 md:pb-8">
          <p>{dict.site.footerNote}</p>
          <Link href={`/${lang}/credits/`} className="inline-flex min-h-11 items-center hover:text-accent">
            {dict.site.credits}
          </Link>
        </footer>
        <BottomNav lang={lang} labels={dict.nav} />
      </body>
    </html>
  );
}
