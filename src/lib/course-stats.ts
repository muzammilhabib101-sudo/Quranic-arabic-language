"use client";

import type { CourseIndex, LessonLite } from "@/content/course";
import { lessonPercent, streak, useHydrated, useStore } from "./store";

/**
 * Everything the dashboard-style pages show, computed from saved progress.
 * Before hydration it reports a fresh learner, matching the server HTML.
 */
export function useCourseStats(index: CourseIndex) {
  const hydrated = useHydrated();
  const lessons = useStore((s) => s.lessons);
  const lastSlide = useStore((s) => s.lastSlide);
  const lastLessonId = useStore((s) => s.lastLesson);
  const activeDays = useStore((s) => s.activeDays);

  const progress = hydrated ? lessons : {};
  const percentOf = (l: LessonLite) => lessonPercent(progress[l.id], l.total);
  const isDone = (l: LessonLite) => percentOf(l) === 100;

  const lessonsDone = index.lessons.filter(isDone).length;
  const slidesSeen = index.lessons.reduce(
    (sum, l) => sum + Math.min(progress[l.id]?.seen.length ?? 0, l.total),
    0,
  );
  const totalSlides = index.lessons.reduce((sum, l) => sum + l.total, 0);

  // Where to pick up: the lesson studied last, unless it is finished —
  // then the first unfinished lesson after it.
  const last = hydrated ? lastSlide : null;
  const lastLesson = hydrated
    ? (index.lessons.find((l) => l.id === lastLessonId) ??
      (last ? index.lessons.find((l) => last >= l.from && last <= l.to) : undefined))
    : undefined;
  let current: LessonLite | undefined = lastLesson;
  if (!current || isDone(current)) {
    const start = current ? index.lessons.indexOf(current) : 0;
    current =
      index.lessons.slice(start).find((l) => !isDone(l)) ??
      index.lessons.find((l) => !isDone(l));
  }

  /** First slide of a lesson not yet viewed (or its first slide). */
  const resumeSlide = (l: LessonLite) => {
    const seen = new Set(progress[l.id]?.seen ?? []);
    if (l === lastLesson && last && last >= l.from && last < l.to && !isDone(l)) return last;
    for (let n = l.from; n <= l.to; n++) if (!seen.has(n)) return n;
    return l.from;
  };

  /** Text lessons: the step to resume at and how many steps there are. */
  const stepOf = (l: LessonLite) => {
    const p = progress[l.id];
    return p?.steps ? { step: p.step ?? 0, steps: p.steps } : null;
  };

  /** Where "continue" goes: the lesson player for text lessons, else a slide. */
  const resumeHref = (lang: string, l: LessonLite) =>
    l.format === "text"
      ? `/${lang}/lesson/${l.id}/learn/`
      : `/${lang}/slides/${resumeSlide(l)}/`;

  return {
    hydrated,
    started: hydrated && Object.keys(lessons).length > 0,
    lessonsDone,
    slidesSeen,
    totalSlides,
    percentOf,
    isDone,
    current,
    resumeSlide,
    resumeHref,
    stepOf,
    streak: hydrated ? streak(activeDays) : 0,
    activeDays: hydrated ? activeDays : [],
  };
}
