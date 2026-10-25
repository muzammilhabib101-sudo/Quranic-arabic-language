export type NavKey = "home" | "course" | "practice" | "words" | "progress" | "me";

export type NavLabels = Record<NavKey, string> & { label: string };

/** Paths are relative to the locale prefix, e.g. "/course" → "/ur/course/". */
export const navItems: { key: NavKey; path: string; inBottomBar: boolean }[] = [
  { key: "home", path: "", inBottomBar: true },
  { key: "course", path: "/course", inBottomBar: true },
  { key: "practice", path: "/practice", inBottomBar: true },
  { key: "words", path: "/words", inBottomBar: true },
  { key: "progress", path: "/progress", inBottomBar: true },
  { key: "me", path: "/me", inBottomBar: true },
];

export const hrefFor = (lang: string, path: string) => `/${lang}${path}/`;

/** True when `pathname` is the item's page or a page inside it. */
export function isActive(pathname: string, lang: string, path: string) {
  const base = `/${lang}${path}`;
  const current = pathname.replace(/\/$/, "");
  return path === "" ? current === base : current.startsWith(base);
}
