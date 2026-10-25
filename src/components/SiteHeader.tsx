import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import LanguageSwitch from "./LanguageSwitch";
import TopNav from "./TopNav";

export default function SiteHeader({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 md:px-6">
        <Link href={`/${lang}/`} className="flex items-center gap-3">
          <span
            aria-hidden
            className="arabic grid size-10 place-items-center rounded-xl bg-accent text-2xl leading-none text-accent-ink"
          >
            ع
          </span>
          <span className="text-base font-semibold">{dict.site.name}</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <TopNav lang={lang} labels={dict.nav} />
          <Link
            href={`/${lang}/search/`}
            aria-label={dict.search.label}
            title={dict.search.label}
            className="grid size-11 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <MagnifyingGlass size={20} aria-hidden />
          </Link>
          <LanguageSwitch
            lang={lang}
            label={dict.language.switchLabel}
            text={dict.language.switchTo}
          />
        </div>
      </div>
    </header>
  );
}
