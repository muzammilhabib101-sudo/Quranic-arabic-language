"use client";

import {
  Barbell,
  BookOpenText,
  Books,
  ChartLineUp,
  House,
  UserCircle,
  type IconWeight,
} from "@phosphor-icons/react";
import type { NavKey } from "./nav-items";

const icons = {
  home: House,
  course: BookOpenText,
  practice: Barbell,
  words: Books,
  progress: ChartLineUp,
  me: UserCircle,
} as const;

export default function NavIcon({
  name,
  weight,
  size = 22,
}: {
  name: NavKey;
  weight: IconWeight;
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} weight={weight} aria-hidden />;
}
