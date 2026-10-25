import type { Locale } from "./config";

/** Numbers in Urdu use Urdu digits (۰–۹); English uses 0–9. */
export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(
    locale === "ur" ? "ur-PK-u-nu-arabext" : "en",
  ).format(n);
}

/** Replaces `{name}` placeholders in a message. Numbers are localised. */
export function fill(
  message: string,
  locale: Locale,
  values: Record<string, string | number>,
) {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) return match;
    return typeof value === "number" ? formatNumber(value, locale) : value;
  });
}
