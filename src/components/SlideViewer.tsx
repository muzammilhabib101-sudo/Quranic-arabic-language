"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type TouchEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsIn,
  ArrowsOut,
  CheckCircle,
} from "@phosphor-icons/react";
import { dirOf, type Locale } from "@/i18n/config";
import { useStore } from "@/lib/store";
import Bar from "./Bar";

export type SlideViewerLabels = {
  counter: string;
  alt: string;
  prev: string;
  next: string;
  fullscreen: string;
  exitFullscreen: string;
  goTo: string;
  go: string;
  hint: string;
  toLesson: string;
  lessonDone: string;
  nextLesson: string;
  courseDone: string;
  practise: string;
};

type Props = {
  lang: Locale;
  n: number;
  total: number;
  width: number;
  height: number;
  src: string;
  nextSrc: string | null;
  lesson: { id: string; title: string; from: number; to: number };
  nextLesson: { id: string; title: string } | null;
  labels: SlideViewerLabels;
};

const SWIPE_MIN = 50;

/** Accepts 0–9 as well as Urdu (۰–۹) and Arabic (٠–٩) digits. */
function parseSlideNumber(input: string) {
  const western = input
    .trim()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  return /^\d+$/.test(western) ? Number(western) : NaN;
}

const noop = () => () => {};

export default function SlideViewer({
  lang,
  n,
  total,
  width,
  height,
  src,
  nextSrc,
  lesson,
  nextLesson,
  labels,
}: Props) {
  const router = useRouter();
  const viewSlide = useStore((s) => s.viewSlide);
  const frameRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [jump, setJump] = useState("");
  const canFullscreen = useSyncExternalStore(
    noop,
    () => document.fullscreenEnabled,
    () => false,
  );

  const rtl = dirOf(lang) === "rtl";
  const hrefOf = (k: number) => `/${lang}/slides/${k}/`;
  const prevHref = n > 1 ? hrefOf(n - 1) : null;
  const nextHref = n < total ? hrefOf(n + 1) : null;
  const lessonTotal = lesson.to - lesson.from + 1;
  const lessonEnd = n === lesson.to;

  useEffect(
    () => viewSlide(n, lesson.id, lessonTotal),
    [n, lesson.id, lessonTotal, viewSlide],
  );

  // Warm the cache so the next slide appears instantly.
  useEffect(() => {
    if (nextSrc) new window.Image().src = nextSrc;
  }, [nextSrc]);

  useEffect(() => {
    const onChange = () =>
      setIsFull(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Arrow keys follow reading direction: in Urdu, left moves forward.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const forwardKey = rtl ? "ArrowLeft" : "ArrowRight";
      const backKey = rtl ? "ArrowRight" : "ArrowLeft";
      if (e.key === forwardKey && nextHref) router.push(nextHref);
      if (e.key === backKey && prevHref) router.push(prevHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rtl, nextHref, prevHref, router]);

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    // Like turning a page: in Urdu you swipe right to go forward.
    const forward = rtl ? dx > 0 : dx < 0;
    const target = forward ? nextHref : prevHref;
    if (target) router.push(target);
  }

  function toggleFullscreen() {
    if (!canFullscreen) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  }

  function onJump(e: FormEvent) {
    e.preventDefault();
    const k = parseSlideNumber(jump);
    if (k >= 1 && k <= total) {
      setJump("");
      router.push(hrefOf(k));
    }
  }

  const navButton =
    "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 font-semibold transition-colors sm:flex-none sm:min-w-36";
  const enabled = "border-border bg-surface hover:border-accent hover:text-accent";
  const disabled = "border-border/50 text-muted/40";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${lang}/lesson/${lesson.id}/`}
          aria-label={`${labels.toLesson}: ${lesson.title}`}
          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted hover:text-accent"
        >
          <ArrowLeft size={18} className="shrink-0 rtl:rotate-180" aria-hidden />
          <span className="truncate">{lesson.title}</span>
        </Link>
        <p className="shrink-0 text-sm text-muted" aria-live="polite">
          {labels.counter}
        </p>
      </div>

      <Bar
        percent={Math.round(((n - lesson.from + 1) / lessonTotal) * 100)}
        label={labels.counter}
      />

      <div
        ref={frameRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={
          isFull
            ? "flex items-center justify-center bg-black"
            : "rounded-2xl border border-border bg-surface p-2 md:p-3"
        }
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          disabled={!canFullscreen}
          aria-label={isFull ? labels.exitFullscreen : labels.fullscreen}
          className={`block w-full ${canFullscreen ? (isFull ? "cursor-zoom-out" : "cursor-zoom-in") : "cursor-default"}`}
        >
          <Image
            key={src}
            src={src}
            width={width}
            height={height}
            alt={labels.alt}
            preload
            className={
              isFull
                ? "mx-auto max-h-dvh w-auto max-w-full object-contain brightness-90"
                : "mx-auto h-auto max-h-[calc(100dvh-15rem)] w-auto max-w-full rounded-xl brightness-[.88]"
            }
          />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        {prevHref ? (
          <Link href={prevHref} className={`${navButton} ${enabled}`}>
            <ArrowLeft size={20} className="rtl:rotate-180" aria-hidden />
            {labels.prev}
          </Link>
        ) : (
          <span aria-disabled className={`${navButton} ${disabled}`}>
            <ArrowLeft size={20} className="rtl:rotate-180" aria-hidden />
            {labels.prev}
          </span>
        )}

        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={labels.fullscreen}
            title={labels.fullscreen}
            className="hidden min-h-12 items-center gap-2 rounded-xl px-4 text-muted hover:text-accent sm:flex"
          >
            {isFull ? (
              <ArrowsIn size={20} aria-hidden />
            ) : (
              <ArrowsOut size={20} aria-hidden />
            )}
            {labels.fullscreen}
          </button>
        )}

        {nextHref ? (
          <Link href={nextHref} className={`${navButton} ${enabled}`}>
            {labels.next}
            <ArrowRight size={20} className="rtl:rotate-180" aria-hidden />
          </Link>
        ) : (
          <span aria-disabled className={`${navButton} ${disabled}`}>
            {labels.next}
            <ArrowRight size={20} className="rtl:rotate-180" aria-hidden />
          </span>
        )}
      </div>

      {lessonEnd && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-2/40 bg-accent-2/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-accent-2">
            <CheckCircle size={24} weight="fill" aria-hidden />
            {nextLesson ? labels.lessonDone : labels.courseDone}
          </p>
          <Link
            href={`/${lang}/practice/lesson/${lesson.id}/`}
            className="inline-flex min-h-12 items-center rounded-xl border border-accent px-5 font-semibold text-accent hover:bg-accent/10"
          >
            {labels.practise}
          </Link>
          {nextLesson && (
            <Link
              href={`/${lang}/lesson/${nextLesson.id}/`}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90"
            >
              {labels.nextLesson}: {nextLesson.title}
              <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <form onSubmit={onJump} className="flex items-center gap-2">
          <label htmlFor="slide-jump" className="text-sm text-muted">
            {labels.goTo}
          </label>
          <input
            id="slide-jump"
            inputMode="numeric"
            autoComplete="off"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            className="min-h-11 w-20 rounded-lg border border-border bg-surface px-3 text-center focus:border-accent"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-surface-2 px-4 text-sm hover:text-accent"
          >
            {labels.go}
          </button>
        </form>
        <p className="text-sm text-muted">{labels.hint}</p>
      </div>
    </div>
  );
}
