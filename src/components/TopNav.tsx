"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "./NavIcon";
import { hrefFor, isActive, navItems, type NavLabels } from "./nav-items";

/** Desktop navigation inside the header (hidden on phones). */
export default function TopNav({
  lang,
  labels,
}: {
  lang: string;
  labels: NavLabels;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={labels.label} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, lang, item.path);
          return (
            <li key={item.key}>
              <Link
                href={hrefFor(lang, item.path)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-2 text-accent"
                    : "text-muted hover:bg-surface hover:text-text"
                }`}
              >
                <NavIcon
                  name={item.key}
                  size={18}
                  weight={active ? "fill" : "regular"}
                />
                {labels[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
