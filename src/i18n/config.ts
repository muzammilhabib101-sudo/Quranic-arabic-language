export const locales = ["ur", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ur";

/** localStorage key that remembers the visitor's chosen language. */
export const LOCALE_STORAGE_KEY = "qa-lang";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

export const dirOf = (locale: Locale) => (locale === "ur" ? "rtl" : "ltr");

/** The other language, used by the language switch. */
export const otherLocale = (locale: Locale): Locale =>
  locale === "ur" ? "en" : "ur";
