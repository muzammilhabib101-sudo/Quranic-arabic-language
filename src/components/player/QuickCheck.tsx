"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle, Info } from "@phosphor-icons/react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import Mixed from "../Mixed";
import type { PlayerQuestion } from "./types";

/**
 * Multiple-choice questions, one at a time. No timers, no penalties: every
 * answer is explained, and a missed question comes back once at the end.
 */
export default function QuickCheck({
  lang,
  questions,
  onDone,
  t,
}: {
  lang: Locale;
  questions: PlayerQuestion[];
  onDone: (rightFirstTry: number) => void;
  t: Dictionary["player"];
}) {
  const [queue, setQueue] = useState(() => questions.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [right, setRight] = useState(0);

  const qIndex = queue[pos];
  const q = questions[qIndex];
  const isRepeat = queue.indexOf(qIndex) !== pos;
  const answered = chosen !== null;
  const correct = chosen === q.answer;
  // A first wrong answer appends the question, so this stays false until the real end.
  const last = pos === queue.length - 1;

  function choose(i: number) {
    if (answered) return;
    setChosen(i);
    const ok = i === q.answer;
    if (!isRepeat && ok) setRight((r) => r + 1);
    if (!isRepeat && !ok) setQueue((list) => [...list, qIndex]);
  }

  function next() {
    if (last) {
      onDone(right);
      return;
    }
    setChosen(null);
    setPos((p) => p + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted" aria-live="polite">
        {fill(t.question, lang, { k: pos + 1, total: queue.length })}
        {isRepeat && ` · ${t.again}`}
      </p>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-xl font-semibold">
          <Mixed text={q.prompt} />
        </legend>
        {q.arabic && (
          <p lang="ar" className="arabic mb-2 text-center text-5xl">
            {q.arabic}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const state = !answered
              ? "border-border bg-surface hover:border-accent"
              : i === q.answer
                ? "border-accent-2 bg-accent-2/10 text-accent-2"
                : i === chosen
                  ? "border-wrong bg-wrong/10 text-wrong"
                  : "border-border bg-surface opacity-60";
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                aria-disabled={answered}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-center transition-colors ${state}`}
              >
                {answered && i === q.answer && <CheckCircle size={22} weight="fill" aria-hidden />}
                {o.ar ? (
                  <span lang="ar" className="arabic text-3xl">
                    {o.ar}
                  </span>
                ) : (
                  <Mixed text={o.text ?? ""} />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {answered && (
        <div
          role="status"
          className={`rounded-2xl border p-4 ${
            correct ? "border-accent-2/40 bg-accent-2/10" : "border-wrong/40 bg-wrong/10"
          }`}
        >
          <p className={`mb-1 flex items-center gap-2 font-semibold ${correct ? "text-accent-2" : "text-wrong"}`}>
            {correct ? <CheckCircle size={20} weight="fill" aria-hidden /> : <Info size={20} aria-hidden />}
            {correct ? t.correct : t.notQuite}
          </p>
          <p>
            <Mixed text={q.explanation} />
          </p>
        </div>
      )}

      {answered && (
        <button
          type="button"
          onClick={next}
          className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-accent px-6 font-semibold text-accent-ink hover:opacity-90"
        >
          {last ? t.finish : t.nextQuestion}
          <ArrowRight size={20} weight="bold" className="rtl:rotate-180" aria-hidden />
        </button>
      )}
    </div>
  );
}
