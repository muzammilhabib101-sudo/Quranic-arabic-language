"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowRight, CheckCircle, Info, X } from "@phosphor-icons/react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { usePracticeData } from "@/lib/practice/data";
import { buildSet, makeItem, MIXED, shuffle } from "@/lib/practice/generate";
import { dueIds, type Grade } from "@/lib/practice/srs";
import {
  EXERCISE_TYPES,
  itemWords,
  type ExerciseType,
  type Item,
  type PracticeData,
  type PracticeWord,
} from "@/lib/practice/types";
import { useHydrated, useStore } from "@/lib/store";
import Bar from "../Bar";
import { explain } from "./explain";
import { AnatomyView, ChoiceView, FlashView, MatchView, TranslateView } from "./views";

export type SessionKind = "lesson" | "unit" | "mode" | "review";

type Props = {
  lang: Locale;
  kind: SessionKind;
  id: string;
  title: string;
  t: Dictionary["practice"];
  roles: Dictionary["home"]["roles"];
};

/** Loads the word bank, then builds and runs one practice set. */
export default function PracticeSession(props: Props) {
  const hydrated = useHydrated();
  const { data, error } = usePracticeData();
  const { t } = props;
  const [attempt, setAttempt] = useState(0);

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="mb-3">{t.loadError}</p>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-border px-4">
          {t.retry}
        </button>
      </div>
    );
  }
  if (!hydrated || !data) {
    return (
      <p className="animate-pulse rounded-2xl bg-surface p-6 text-muted" role="status">
        {t.loading}
      </p>
    );
  }
  return <Runner key={attempt} {...props} data={data} onRestart={() => setAttempt((a) => a + 1)} />;
}

/** Chooses the words and exercise types for this session. */
function plan(kind: SessionKind, id: string, data: PracticeData, lang: Locale) {
  const s = useStore.getState();
  const met = new Set(Object.keys(s.lessons));
  const all = data.words;

  if (kind === "review") {
    const due = new Set(dueIds(s.cards).slice(0, 12));
    const words = shuffle(all.filter((w) => due.has(w.id)));
    // Alternate recall (flashcard) with recognition so reviews don't feel samey.
    const items = words.flatMap((w, i) => {
      const type: ExerciseType = i % 2 ? (w.grouped ? "listen" : "meaning") : "flashcard";
      const item = buildSet([w], [type], 1, data, lang)[0];
      return item ? [item] : [];
    });
    return { items, fallback: false };
  }

  let pool = all;
  let types: readonly ExerciseType[] = MIXED;
  let size = 8;
  let fallback = false;
  if (kind === "lesson") {
    pool = all.filter((w) => w.lesson === id);
    size = 9; // room for the pattern exercise when the verse has a patterned word
  }
  if (kind === "unit") {
    const unitWords = all.filter((w) => w.unit === id);
    const metWords = unitWords.filter((w) => met.has(w.lesson));
    pool = metWords.length >= 6 ? metWords : unitWords;
    size = 10;
  }
  if (kind === "mode") {
    const type = id as ExerciseType;
    const metWords = all.filter((w) => met.has(w.lesson));
    pool = metWords.length >= 6 ? metWords : all.filter((w) => w.lesson === "u1-l1");
    fallback = metWords.length < 6;
    if (type === "pattern") pool = pool.filter((w) => w.pattern).length >= 3 ? pool.filter((w) => w.pattern) : all.filter((w) => w.pattern);
    if (type === "anatomy") pool = pool.some((w) => w.segs) ? pool : all.filter((w) => w.segs);
    types = Array(size).fill(type);
  }
  let items = buildSet(pool, types, size, data, lang);
  if (items.length < 3) items = buildSet(all, types, size, data, lang);
  return { items: withFocus(items, pool, data, lang), fallback };
}

/**
 * A link like ?word=49:2:5&type=match opens the set with that exercise, so a
 * teacher can point straight at one question. Unknown values are ignored.
 */
function withFocus(items: Item[], pool: PracticeWord[], data: PracticeData, lang: Locale) {
  const params = new URLSearchParams(window.location.search);
  const word = data.words.find((w) => w.id === params.get("word"));
  const type = params.get("type") as ExerciseType | null;
  if (!word || !type || !EXERCISE_TYPES.includes(type)) return items;
  const focus = makeItem(type, word, pool.includes(word) ? pool : data.words, data, lang);
  if (!focus) return items;
  const same = (it: Item) => it.type === type && itemWords(it).some((w) => w.id === word.id);
  return [focus, ...items.filter((it) => !same(it))];
}

function Runner({ lang, kind, id, title, t, roles, data, onRestart }: Props & { data: PracticeData; onRestart: () => void }) {
  const [{ items, fallback }] = useState(() => plan(kind, id, data, lang));
  const [queue, setQueue] = useState(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const answer = useStore((s) => s.answer);
  const rate = useStore((s) => s.rate);
  const finishPractice = useStore((s) => s.finishPractice);

  const backHref = kind === "lesson" ? `/${lang}/lesson/${id}/` : `/${lang}/practice/`;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <p>{t.emptyReview}</p>
        <Link href={`/${lang}/practice/`} className="min-h-11 self-start content-center rounded-xl bg-accent px-5 font-semibold text-accent-ink">
          {t.backToPractice}
        </Link>
      </div>
    );
  }

  const index = queue[pos];
  const item: Item = items[index];
  const isRepeat = queue.indexOf(index) !== pos;
  const last = pos === queue.length - 1;

  function onAnswer(correct: boolean, perWord?: Record<string, boolean>) {
    setResult(correct);
    const unit = itemWords(item)[0].unit;
    if (perWord) {
      for (const [wid, ok] of Object.entries(perWord)) answer([wid], unit, ok, false);
      answer([], unit, correct, !isRepeat);
    } else {
      answer(itemWords(item).map((w) => w.id), unit, correct, !isRepeat);
    }
    if (!isRepeat && correct) setRight((r) => r + 1);
    if (!isRepeat && !correct) setQueue((q) => [...q, index]);
  }

  function onRate(grade: Grade) {
    rate(itemWords(item)[0].id, grade);
    if (!isRepeat && grade >= 3) setRight((r) => r + 1);
    next();
  }

  function next() {
    if (pos >= queue.length - 1) {
      finishPractice(kind === "lesson" ? id : null);
      setDone(true);
    } else {
      setPos((p) => p + 1);
      setResult(null);
    }
    window.scrollTo({ top: 0 });
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={backHref} className="flex min-h-11 items-center gap-1 text-sm text-muted hover:text-accent">
          <X size={20} aria-hidden />
          {t.exit}
        </Link>
        {!done && (
          <p className="text-sm text-muted" aria-live="polite">
            {fill(t.item, lang, { k: pos + 1, total: queue.length })}
            {isRepeat && ` · ${t.again}`}
          </p>
        )}
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      {!done && <Bar percent={Math.round((pos / queue.length) * 100)} label={fill(t.item, lang, { k: pos + 1, total: queue.length })} />}
      {fallback && pos === 0 && <p className="text-sm text-muted">{t.metNone}</p>}
    </header>
  );

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-10 text-center">
          <CheckCircle size={64} weight="fill" className="text-accent-2" aria-hidden />
          <h2 className="text-2xl font-bold">{t.doneTitle}</h2>
          <p className="text-lg">{fill(t.doneBody, lang, { right, total: items.length })}</p>
          <p className="max-w-md text-muted">{t.doneReview}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onRestart} className="min-h-12 rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90">
              {t.practiseAgain}
            </button>
            <Link href={`/${lang}/practice/`} className="min-h-12 content-center rounded-xl border border-border px-5 hover:border-accent hover:text-accent">
              {t.backToPractice}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const typeText = t.types[item.type];
  const answered = result !== null;
  const word = itemWords(item)[0];

  return (
    <div className="flex flex-col gap-5">
      {header}
      <section aria-labelledby="ex-prompt" className="flex flex-col gap-5">
        <div>
          <p className="text-sm text-accent">{typeText.name}</p>
          <h2 id="ex-prompt" className="text-xl font-semibold">
            {typeText.prompt}
          </h2>
        </div>

        <div key={`${pos}-${index}`}>
          {item.kind === "choice" && <ChoiceView item={item} t={t} roles={roles} onAnswer={onAnswer} />}
          {item.kind === "match" && <MatchView item={item} lang={lang} t={t} onAnswer={onAnswer} />}
          {item.kind === "anatomy" && <AnatomyView item={item} t={t} onAnswer={onAnswer} />}
          {item.kind === "translate" && <TranslateView item={item} t={t} onAnswer={onAnswer} />}
          {item.kind === "flash" && <FlashView item={item} lang={lang} t={t} roles={roles} onRate={onRate} />}
        </div>

        {answered && (
          <div role="status" className={`rounded-2xl border p-4 ${result ? "border-accent-2/40 bg-accent-2/10" : "border-wrong/40 bg-wrong/10"}`}>
            <p className={`mb-1 flex items-center gap-2 font-semibold ${result ? "text-accent-2" : "text-wrong"}`}>
              {result ? <CheckCircle size={20} weight="fill" aria-hidden /> : <Info size={20} aria-hidden />}
              {result ? t.correct : t.notQuite}
            </p>
            <p className="leading-loose">
              {explain(item, data, lang, t, roles).map((n, i) => (
                <Fragment key={i}>{n}</Fragment>
              ))}
            </p>
            <Link href={`/${lang}/lesson/${word.lesson}/`} className="mt-2 inline-block text-sm text-muted underline hover:text-accent">
              {t.viewInLesson}
            </Link>
          </div>
        )}

        {answered && (
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90"
          >
            {last ? t.finish : t.next}
            <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
          </button>
        )}
      </section>
    </div>
  );
}

export const SESSION_MODES = EXERCISE_TYPES;
