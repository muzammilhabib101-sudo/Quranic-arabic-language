"use client";

import { useEffect, useRef } from "react";
import { BookmarkSimple, SpeakerHigh, X } from "@phosphor-icons/react";
import type { Dictionary } from "@/i18n/dictionaries";
import { useStore } from "@/lib/store";
import Mixed from "../Mixed";
import { roleChip, roleTag } from "./roles";
import type { PlayerWord } from "./types";

/** Modal sheet with everything about one word of the verse. */
export default function WordSheet({
  word,
  lessonId,
  onClose,
  t,
  roles,
}: {
  word: PlayerWord | null;
  lessonId: string;
  onClose: () => void;
  t: Dictionary["player"];
  roles: Dictionary["home"]["roles"];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const saved = useStore((s) => (word ? s.savedWords.some((w) => w.id === word.id) : false));
  const toggleWord = useStore((s) => s.toggleWord);

  useEffect(() => {
    const dialog = ref.current;
    if (word && dialog && !dialog.open) dialog.showModal();
  }, [word]);

  function playWord() {
    if (!word) return;
    audio.current?.pause();
    audio.current = new Audio(word.audio);
    void audio.current.play();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="word-sheet-title"
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface-2 p-0 text-text backdrop:bg-black/70"
    >
      {word && (
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="word-sheet-title" lang="ar" className="quran text-5xl leading-[1.6]">
                {word.ar}
              </h2>
              {word.transliteration && (
                <p dir="ltr" className="text-sm text-muted">
                  {word.transliteration}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={t.close}
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-text"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          <div>
            <p className="text-sm text-muted">{t.meaning}</p>
            <p className="text-2xl font-semibold">{word.meaning}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full px-3 ${roleTag[word.role]}`}>{roles[word.role]}</span>
            {word.root && (
              <span className="rounded-full bg-surface px-3 text-muted">
                {t.root}: <span lang="ar" className="arabic text-text">{word.root}</span>
              </span>
            )}
            {word.pattern && (
              <span className="rounded-full bg-surface px-3 text-muted">
                {t.pattern}: <span lang="ar" className="arabic text-text">{word.pattern}</span>
              </span>
            )}
          </div>

          <section aria-label={t.parts}>
            <p className="mb-2 text-sm text-muted">{t.parts}</p>
            <ol dir="rtl" className="flex flex-wrap items-stretch gap-2">
              {word.parts.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden className="text-xl text-muted">+</span>}
                  <span className={`flex flex-col items-center rounded-xl border px-4 py-1 ${roleChip[p.role]}`}>
                    <span lang="ar" className="arabic text-3xl">{p.text}</span>
                    <span className="text-xs">{p.label}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {word.patternMeaning && (
            <p className="rounded-xl bg-surface p-3 text-sm">
              <span className="text-muted">{t.pattern} </span>
              <span lang="ar" className="arabic">{word.pattern}</span>: <Mixed text={word.patternMeaning} />
            </p>
          )}

          <section>
            <h3 className="mb-1 font-semibold text-accent">{t.why}</h3>
            <p>
              <Mixed text={word.why} />
            </p>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={playWord}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 hover:border-accent hover:text-accent"
            >
              <SpeakerHigh size={20} aria-hidden />
              {t.playWord}
            </button>
            <button
              type="button"
              aria-pressed={saved}
              onClick={() =>
                toggleWord({ id: word.id, ar: word.ar, meaning: word.meaningText, lessonId })
              }
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 ${
                saved
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent hover:text-accent"
              }`}
            >
              <BookmarkSimple size={20} weight={saved ? "fill" : "regular"} aria-hidden />
              {saved ? t.saved : t.save}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
