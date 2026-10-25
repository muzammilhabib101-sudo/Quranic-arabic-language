"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Images,
  Lightbulb,
  Question,
  Target,
  X,
} from "@phosphor-icons/react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { useHydrated, useStore } from "@/lib/store";
import Mixed from "../Mixed";
import AudioPlayer from "./AudioPlayer";
import QuickCheck from "./QuickCheck";
import { roleChip, roleTag } from "./roles";
import type { PlayerData, PlayerWord } from "./types";
import WordSheet from "./WordSheet";

const STEPS = ["learn", "read", "words", "connect", "remember", "check"] as const;

type Props = {
  lang: Locale;
  data: PlayerData;
  t: Dictionary["player"];
  roles: Dictionary["home"]["roles"];
};

/**
 * The six-step text lesson. It waits for hydration so it can resume at the
 * step saved in this browser.
 */
export default function LessonPlayer(props: Props) {
  const hydrated = useHydrated();
  const saved = useStore((s) => s.lessons[props.data.lessonId]);
  if (!hydrated) {
    return <div className="h-[70dvh] animate-pulse rounded-2xl bg-surface" aria-hidden />;
  }
  const start = saved && !saved.done ? Math.min(saved.step ?? 0, STEPS.length - 1) : 0;
  return <Player {...props} initialStep={start} />;
}

function Player({ lang, data, t, roles, initialStep }: Props & { initialStep: number }) {
  const [step, setStep] = useState(initialStep);
  const [word, setWord] = useState<PlayerWord | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const reachStep = useStore((s) => s.reachStep);
  const completeLesson = useStore((s) => s.completeLesson);
  const transliteration = useStore((s) => s.settings.transliteration);
  const setSetting = useStore((s) => s.setSetting);
  const helpRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => reachStep(data.lessonId, step, STEPS.length), [data.lessonId, step, reachStep]);

  function go(n: number) {
    setStep(n);
    window.scrollTo({ top: 0 });
    // Move focus to the new step's heading so screen readers announce it.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function finish(right: number) {
    completeLesson(data.lessonId);
    setResult(right);
    window.scrollTo({ top: 0 });
  }

  const key = STEPS[step];
  const card = "rounded-2xl border border-border bg-surface p-5";

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Header ---------- */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/${lang}/lesson/${data.lessonId}/`}
            className="flex min-h-11 items-center gap-1 text-sm text-muted hover:text-accent"
          >
            <X size={20} aria-hidden />
            {t.exit}
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={`/${lang}/slides/${data.slidesFrom}/`}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-accent"
            >
              <Images size={20} aria-hidden />
              <span className="hidden sm:inline">{t.original}</span>
              <span className="sr-only sm:hidden">{t.original}</span>
            </Link>
            <button
              type="button"
              onClick={() => helpRef.current?.showModal()}
              className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-sm text-muted hover:text-accent"
            >
              <Question size={20} aria-hidden />
              <span className="hidden sm:inline">{t.help}</span>
              <span className="sr-only sm:hidden">{t.help}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">
            <Mixed text={data.title} />
          </h1>
          {data.draft && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 text-xs text-accent">
              {/* Same wording as the lesson page */}
              {t.draft}
            </span>
          )}
        </div>

        {result === null && (
          <>
            <ol className="grid grid-cols-6 gap-1.5" aria-label={fill(t.step, lang, { k: step + 1, total: STEPS.length })}>
              {STEPS.map((s, i) => (
                <li key={s} className={`h-1.5 rounded-full ${i <= step ? "bg-accent-2" : "bg-surface-2"}`}>
                  <span className="sr-only">{t.steps[s]}</span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">
              {fill(t.step, lang, { k: step + 1, total: STEPS.length })}
            </p>
          </>
        )}
        {data.englishPending && <p className="text-sm text-muted">{t.englishSoon}</p>}
      </header>

      {/* ---------- Finished ---------- */}
      {result !== null ? (
        <section className={`${card} flex flex-col items-center gap-4 py-10 text-center`}>
          <CheckCircle size={64} weight="fill" className="text-accent-2" aria-hidden />
          <h2 className="text-2xl font-bold">{t.doneTitle}</h2>
          <p className="max-w-md text-muted">
            {fill(t.doneBody, lang, { right: result, total: data.check.length })}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {data.next && (
              <Link
                href={`/${lang}/lesson/${data.next.id}/`}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90"
              >
                {t.nextLesson}: {data.next.title}
                <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
              </Link>
            )}
            <Link
              href={`/${lang}/practice/lesson/${data.lessonId}/`}
              className="inline-flex min-h-12 items-center rounded-xl border border-accent px-5 font-semibold text-accent hover:bg-accent/10"
            >
              {t.practise}
            </Link>
            <Link
              href={`/${lang}/lesson/${data.lessonId}/`}
              className="inline-flex min-h-12 items-center rounded-xl border border-border px-5 hover:border-accent hover:text-accent"
            >
              {t.backToLesson}
            </Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="step-title" className="flex flex-col gap-5">
          <h2 id="step-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none">
            {t.steps[key]}
          </h2>

          {/* 1. What you will learn */}
          {key === "learn" && (
            <>
              <div className={`${card} flex items-start gap-4 border-accent/40`}>
                <Target size={28} className="shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="text-sm text-accent">{t.goal}</p>
                  <p className="text-lg">
                    <Mixed text={data.goal} />
                  </p>
                </div>
              </div>
              <ul className="grid gap-3 md:grid-cols-3">
                {data.concepts.map((c) => (
                  <li key={c.title} className={card}>
                    <h3 className="mb-1 font-semibold">{c.title}</h3>
                    <p className="text-muted">
                      <Mixed text={c.body} />
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* 2. Read it first */}
          {key === "read" && (
            <figure className={`${card} flex flex-col gap-4 md:p-8`}>
              <blockquote lang="ar" className="quran text-center text-[2.25rem] md:text-[2.75rem]">
                {data.verse.text}
              </blockquote>
              <label className="flex items-center gap-2 self-center text-sm text-muted">
                <input
                  type="checkbox"
                  checked={transliteration}
                  onChange={(e) => setSetting("transliteration", e.target.checked)}
                  className="size-5 accent-[var(--accent-2)]"
                />
                {t.translit}
              </label>
              {transliteration && (
                <p dir="ltr" lang="ar-Latn" className="text-center text-muted italic">
                  {data.verse.transliteration}
                </p>
              )}
              <p className="text-center text-lg">{data.verse.translation}</p>
              <figcaption className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm text-muted">
                <span>{data.verse.reference}</span>
                <span>{data.verse.translationCredit}</span>
              </figcaption>
              <AudioPlayer
                src={data.verse.audio}
                labels={{ play: t.play, pause: t.pause, speed: t.speed, reciter: t.reciter }}
              />
            </figure>
          )}

          {/* 3. Word by word */}
          {key === "words" && (
            <>
              <p className="text-muted">{t.tapWord}</p>
              <ul dir="rtl" className="flex flex-wrap justify-center gap-3">
                {data.words.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => setWord(w)}
                      aria-haspopup="dialog"
                      className={`flex min-w-28 flex-col items-center gap-1 rounded-2xl border-2 px-5 py-3 transition-transform hover:-translate-y-0.5 ${roleChip[w.role]}`}
                    >
                      <span lang="ar" className="quran text-4xl leading-[1.6]">
                        {w.ar}
                      </span>
                      <span dir="auto" className="text-sm text-text">
                        {w.meaning}
                      </span>
                      <span className={`rounded-full px-2 text-xs ${roleTag[w.role]}`}>{roles[w.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <WordSheet word={word} lessonId={data.lessonId} onClose={() => setWord(null)} t={t} roles={roles} />
            </>
          )}

          {/* 4. How the words connect */}
          {key === "connect" && (
            <>
              <ol dir="rtl" className={`${card} flex flex-wrap items-center justify-center gap-2`}>
                {data.flow.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i > 0 && (
                      <span aria-hidden className="text-xl text-muted">
                        ←
                      </span>
                    )}
                    <span className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2 ${roleChip[f.role]}`}>
                      <span lang="ar" className={f.quran ? "quran text-3xl leading-[1.8]" : "arabic text-3xl"}>
                        {f.text}
                      </span>
                      <span dir="auto" className="text-xs text-text">
                        {f.label}
                      </span>
                      <span className={`rounded-full px-2 text-[0.7rem] ${roleTag[f.role]}`}>{roles[f.role]}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className={card}>
                <h3 className="mb-2 font-semibold text-accent">{t.plain}</h3>
                <p className="text-lg">
                  <Mixed text={data.plain} />
                </p>
              </div>
            </>
          )}

          {/* 5. Remember this */}
          {key === "remember" && (
            <>
              <div className={`${card} flex items-start gap-4 border-accent/40 bg-accent/5`}>
                <Lightbulb size={28} className="shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="text-sm text-accent">{t.rule}</p>
                  <p className="text-lg font-semibold">
                    <Mixed text={data.rule} />
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {data.points.map((p, i) => (
                  <li key={i} className={`${card} flex items-start gap-3`}>
                    <CheckCircle size={22} weight="fill" className="mt-1 shrink-0 text-accent-2" aria-hidden />
                    <p>
                      <Mixed text={p} />
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* 6. Quick check */}
          {key === "check" && <QuickCheck lang={lang} questions={data.check} onDone={finish} t={t} />}

          {/* Step navigation (the quick check has its own) */}
          {key !== "check" && (
            <div className="flex justify-between gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-40"
              >
                <ArrowLeft size={20} className="rtl:rotate-180" aria-hidden />
                {t.back}
              </button>
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90"
              >
                {t.next}: {t.steps[STEPS[step + 1]]}
                <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
              </button>
            </div>
          )}
          {key === "check" && (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted hover:text-accent"
            >
              <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden />
              {t.back}
            </button>
          )}
        </section>
      )}

      <dialog
        ref={helpRef}
        onClick={(e) => e.target === helpRef.current && helpRef.current.close()}
        aria-labelledby="help-title"
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface-2 p-5 text-text backdrop:bg-black/70"
      >
        <h2 id="help-title" className="mb-2 text-lg font-semibold">
          {t.help}
        </h2>
        <p className="mb-4 text-muted">{t.helpBody}</p>
        <button
          type="button"
          onClick={() => helpRef.current?.close()}
          className="min-h-11 rounded-xl bg-accent px-5 font-semibold text-accent-ink"
        >
          {t.close}
        </button>
      </dialog>
    </div>
  );
}
