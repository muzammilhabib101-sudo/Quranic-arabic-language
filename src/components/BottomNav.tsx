"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "./NavIcon";
import { hrefFor, isActive, navItems, type NavLabels } from "./nav-items";

/** Phone navigation fixed to the bottom of the screen (hidden on desktop). */
export default function BottomNav({
  lang,
  labels,
}: {
  lang: string;
  labels: NavLabels;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={labels.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {navItems
          .filter((item) => item.inBottomBar)
          .map((item) => {
            const active = isActive(pathname, lang, item.path);
            return (
              <li key={item.key} className="flex-1">
                <Link
                  href={hrefFor(lang, item.path)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs leading-tight ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <NavIcon name={item.key} weight={active ? "fill" : "regular"} />
                  {labels[item.key]}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
