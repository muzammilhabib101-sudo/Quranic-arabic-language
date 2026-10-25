"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Translate } from "@phosphor-icons/react";
import { LOCALE_STORAGE_KEY, otherLocale, type Locale } from "@/i18n/config";

/** Links to the same page in the other language and remembers the choice. */
export default function LanguageSwitch({
  lang,
  label,
  text,
}: {
  lang: Locale;
  label: string;
  text: string;
}) {
  const pathname = usePathname();
  const target = otherLocale(lang);
  const href = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), `/${target}`);

  return (
    <Link
      href={href}
      onClick={() => {
        try {
          localStorage.setItem(LOCALE_STORAGE_KEY, target);
        } catch {
          // Storage can be blocked (private mode); the link still works.
        }
      }}
      className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-text transition-colors hover:border-accent hover:text-accent"
    >
      <Translate size={18} aria-hidden />
      <span lang={target}>{text}</span>
      {/* The visible word starts the accessible name, so voice control can use it. */}
      <span className="sr-only"> — {label}</span>
    </Link>
  );
}
