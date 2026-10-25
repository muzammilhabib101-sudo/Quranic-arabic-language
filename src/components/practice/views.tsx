"use client";

import { useRef, useState } from "react";
import { CheckCircle, SpeakerHigh, XCircle } from "@phosphor-icons/react";
import type { Dictionary } from "@/i18n/dictionaries";
import { Rating, type Grade } from "@/lib/practice/srs";
import type {
  AnatomyItem,
  ChoiceItem,
  FlashItem,
  Lang,
  MatchItem,
  PracticeWord,
  SegKind,
  TranslateItem,
} from "@/lib/practice/types";
import { roleChip } from "../player/roles";
import { segLabel } from "./explain";

type T = Dictionary["practice"];
type Roles = Dictionary["home"]["roles"];
type Answer = (correct: boolean, perWord?: Record<string, boolean>) => void;

const right = "border-accent-2 bg-accent-2/10 text-accent-2";
const wrong = "border-wrong bg-wrong/10 text-wrong";
const idle = "border-border bg-surface hover:border-accent";
const meaningOf = (w: PracticeWord, lang: Lang) => w.m[lang] || w.m.ur;

function usePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  return (src: string) => {
    audio.current?.pause();
    audio.current = new Audio(src);
    void audio.current.play();
  };
}

function PlayButton({ src, label, big }: { src: string; label: string; big?: boolean }) {
  const play = usePlayer();
  return (
    <button
      type="button"
      onClick={() => play(src)}
      className={`inline-flex items-center gap-2 rounded-xl border border-border hover:border-accent hover:text-accent ${
        big ? "min-h-16 px-8 text-lg" : "min-h-11 px-4 text-sm"
      }`}
    >
      <SpeakerHigh size={big ? 28 : 18} aria-hidden />
      {label}
    </button>
  );
}

/** The verse around a word: highlighted (role) or replaced by a gap (fill). */
function VerseContext({ words, target, gap }: { words: PracticeWord[]; target: PracticeWord; gap?: boolean }) {
  return (
    <p dir="rtl" lang="ar" className="quran flex flex-wrap justify-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface p-4 text-3xl leading-[1.9]">
      {words.map((w) =>
        w.id !== target.id ? (
          <span key={w.id}>{w.ar}</span>
        ) : gap ? (
          <span key={w.id} className="inline-block min-w-24 rounded-lg border-2 border-dashed border-accent" aria-label="___">
            &nbsp;
          </span>
        ) : (
          <mark key={w.id} className="rounded-lg bg-accent/20 px-1 text-accent">
            {w.ar}
          </mark>
        ),
      )}
    </p>
  );
}

// ---------- Multiple choice: meaning, listen, root, pattern, role, fill ----------

export function ChoiceView({ item, t, roles, onAnswer }: { item: ChoiceItem; t: T; roles: Roles; onAnswer: Answer }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const w = item.word;

  function choose(i: number) {
    if (chosen !== null) return;
    setChosen(i);
    onAnswer(i === item.answer);
  }

  // Root letters and patterns are typed fragments (Amiri); words are KFGQPC text.
  const optionFont = item.type === "root" || item.type === "pattern" ? "arabic" : "quran";

  return (
    <div className="flex flex-col gap-5">
      {item.type === "listen" ? (
        <div className="flex justify-center">
          <PlayButton src={w.audio} label={t.play} big />
        </div>
      ) : item.type === "role" || item.type === "fill" ? (
        <VerseContext words={item.context!} target={w} gap={item.type === "fill"} />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p lang="ar" className="quran text-6xl leading-[1.7]">
            {w.ar}
          </p>
          <PlayButton src={w.audio} label={t.play} />
        </div>
      )}

      <div className={`grid gap-3 ${item.options.length > 3 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {item.options.map((o, i) => {
          const state = chosen === null ? idle : i === item.answer ? right : i === chosen ? wrong : "border-border bg-surface opacity-50";
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              aria-disabled={chosen !== null}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 transition-colors ${state}`}
            >
              {chosen !== null && i === item.answer && <CheckCircle size={22} weight="fill" aria-hidden />}
              {o.ar ? (
                <span lang="ar" className={`${optionFont} text-3xl leading-[1.7]`}>
                  {o.ar}
                </span>
              ) : item.type === "role" ? (
                roles[o.text as keyof Roles]
              ) : (
                <span dir="auto">{o.text}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Match ----------

export function MatchView({ item, lang, t, onAnswer }: { item: MatchItem; lang: Lang; t: T; onAnswer: Answer }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pairs, setPairs] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const pairOfMeaning = (m: number) => Object.entries(pairs).find(([, v]) => v === m)?.[0];
  const okFor = (wi: number) => item.meanings[pairs[wi]] === meaningOf(item.words[wi], lang);

  function tapWord(i: number) {
    if (checked) return;
    if (pairs[i] !== undefined) {
      const next = { ...pairs };
      delete next[i];
      setPairs(next);
      return;
    }
    setSelected(selected === i ? null : i);
  }

  function tapMeaning(m: number) {
    if (checked || selected === null) return;
    const next = { ...pairs };
    const holder = pairOfMeaning(m);
    if (holder !== undefined) delete next[Number(holder)];
    next[selected] = m;
    setPairs(next);
    setSelected(null);
  }

  function check() {
    setChecked(true);
    const perWord = Object.fromEntries(item.words.map((w, i) => [w.id, okFor(i)]));
    onAnswer(Object.values(perWord).every(Boolean), perWord);
  }

  const complete = Object.keys(pairs).length === item.words.length;
  const pairColour = ["bg-accent/25", "bg-verb/25", "bg-noun/25", "bg-particle/40"];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t.match.pick}</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="flex flex-col gap-2">
          {item.words.map((w, i) => {
            const paired = pairs[i] !== undefined;
            const state = checked ? (okFor(i) ? right : wrong) : selected === i ? "border-accent bg-accent/10" : idle;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => tapWord(i)}
                  aria-pressed={selected === i}
                  className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border-2 px-2 ${state}`}
                >
                  {paired && !checked && <span aria-hidden className={`size-3 rounded-full ${pairColour[i]}`} />}
                  <span lang="ar" className="quran text-3xl leading-[1.7]">
                    {w.ar}
                  </span>
                </button>
                {checked && !okFor(i) && (
                  <p className="mt-1 text-center text-sm text-accent-2" dir="auto">
                    {meaningOf(w, lang)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <ul className="flex flex-col gap-2">
          {item.meanings.map((m, mi) => {
            const holder = pairOfMeaning(mi);
            return (
              <li key={mi}>
                <button
                  type="button"
                  onClick={() => tapMeaning(mi)}
                  className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-center ${
                    holder !== undefined ? "border-border bg-surface-2" : idle
                  }`}
                >
                  {holder !== undefined && <span aria-hidden className={`size-3 shrink-0 rounded-full ${pairColour[Number(holder)]}`} />}
                  <span dir="auto">{m}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={!complete}
          className="min-h-12 self-start rounded-xl bg-accent px-6 font-semibold text-accent-ink disabled:opacity-40"
        >
          {t.check}
        </button>
      )}
    </div>
  );
}

// ---------- Word parts ----------

const KINDS: SegKind[] = ["pre", "stem", "suf"];

export function AnatomyView({ item, t, onAnswer }: { item: AnatomyItem; t: T; onAnswer: Answer }) {
  const segs = item.word.segs!;
  const [labels, setLabels] = useState<(SegKind | null)[]>(() => segs.map(() => null));
  const [checked, setChecked] = useState(false);

  function check() {
    setChecked(true);
    onAnswer(segs.every((s, i) => labels[i] === s.k));
  }

  return (
    <div className="flex flex-col gap-5">
      <p lang="ar" className="quran text-center text-6xl leading-[1.7]">
        {item.word.ar}
      </p>
      <ol dir="rtl" className="flex flex-wrap justify-center gap-3">
        {segs.map((s, i) => {
          const ok = labels[i] === s.k;
          return (
            <li key={i} className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 ${checked ? (ok ? right : wrong) : "border-border bg-surface"}`}>
              <span lang="ar" className="arabic text-4xl">
                {s.t}
              </span>
              <div role="radiogroup" aria-label={s.t} className="flex flex-col gap-1">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={labels[i] === k}
                    disabled={checked}
                    onClick={() => setLabels((l) => l.map((x, j) => (j === i ? k : x)))}
                    className={`min-h-11 rounded-lg border px-3 text-sm ${
                      labels[i] === k ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-text"
                    } ${checked && k === s.k ? "ring-2 ring-accent-2" : ""}`}
                  >
                    {t.seg[k]}
                  </button>
                ))}
              </div>
              {checked && segLabel(s, t) && <span className="text-xs text-text">{segLabel(s, t)}</span>}
            </li>
          );
        })}
      </ol>
      {!checked && (
        <button
          type="button"
          onClick={check}
          disabled={labels.some((l) => l === null)}
          className="min-h-12 self-start rounded-xl bg-accent px-6 font-semibold text-accent-ink disabled:opacity-40"
        >
          {t.check}
        </button>
      )}
    </div>
  );
}

// ---------- Build the meaning ----------

export function TranslateView({ item, t, onAnswer }: { item: TranslateItem; t: T; onAnswer: Answer }) {
  const [order, setOrder] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  function check() {
    setChecked(true);
    onAnswer(order.every((tile, i) => item.tiles[tile].index === i));
  }

  return (
    <div className="flex flex-col gap-4">
      <p dir="rtl" lang="ar" className="quran flex flex-wrap justify-center gap-x-4 rounded-2xl border border-border bg-surface p-4 text-3xl leading-[1.9]">
        {item.words.map((w) => (
          <span key={w.id}>{w.ar}</span>
        ))}
      </p>
      <div>
        <p className="mb-2 text-sm text-muted">{t.translate.yourOrder}</p>
        <ol className="flex min-h-14 flex-wrap gap-2 rounded-2xl border-2 border-dashed border-border p-2">
          {order.map((tile, i) => {
            const ok = item.tiles[tile].index === i;
            return (
              <li key={tile}>
                <button
                  type="button"
                  disabled={checked}
                  onClick={() => setOrder((o) => o.filter((x) => x !== tile))}
                  className={`min-h-11 rounded-xl border-2 px-3 ${checked ? (ok ? right : wrong) : "border-accent bg-accent/10"}`}
                >
                  <span dir="auto">{item.tiles[tile].text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <ul className="flex flex-wrap gap-2">
        {item.tiles.map((tile, i) =>
          order.includes(i) ? null : (
            <li key={i}>
              <button
                type="button"
                disabled={checked || order.length === item.words.length}
                onClick={() => setOrder((o) => [...o, i])}
                className={`min-h-11 rounded-xl border-2 px-3 ${idle} disabled:opacity-40`}
              >
                <span dir="auto">{tile.text}</span>
              </button>
            </li>
          ),
        )}
      </ul>
      {!checked && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={check}
            disabled={order.length !== item.words.length}
            className="min-h-12 rounded-xl bg-accent px-6 font-semibold text-accent-ink disabled:opacity-40"
          >
            {t.check}
          </button>
          <button type="button" onClick={() => setOrder([])} className="min-h-12 rounded-xl border border-border px-4 text-muted hover:text-text">
            {t.translate.clear}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Flashcard ----------

const GRADES: { grade: Grade; key: "again" | "hard" | "good" | "easy"; style: string }[] = [
  { grade: Rating.Again, key: "again", style: "border-wrong/60 text-wrong" },
  { grade: Rating.Hard, key: "hard", style: "border-particle/60 text-particle" },
  { grade: Rating.Good, key: "good", style: "border-accent-2/60 text-accent-2" },
  { grade: Rating.Easy, key: "easy", style: "border-verb/60 text-verb" },
];

export function FlashView({ item, lang, t, roles, onRate }: { item: FlashItem; lang: Lang; t: T; roles: Roles; onRate: (g: Grade) => void }) {
  const [shown, setShown] = useState(false);
  const w = item.word;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
        <p lang="ar" className="quran text-6xl leading-[1.7]">
          {w.ar}
        </p>
        <PlayButton src={w.audio} label={t.play} />
        {shown && (
          <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
            <p className="text-2xl font-semibold" dir="auto">
              {meaningOf(w, lang)}
            </p>
            {w.tl && (
              <p dir="ltr" className="text-sm text-muted italic">
                {w.tl}
              </p>
            )}
            <p className="flex flex-wrap justify-center gap-2 text-sm">
              <span className={`rounded-full border px-3 ${roleChip[w.role]}`}>{roles[w.role]}</span>
              {w.root && (
                <span lang="ar" className="arabic rounded-full bg-surface-2 px-3">
                  {w.root}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
      {!shown ? (
        <button type="button" onClick={() => setShown(true)} className="min-h-12 rounded-xl bg-accent px-8 font-semibold text-accent-ink">
          {t.flash.show}
        </button>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <p className="text-sm text-muted">{t.flash.rateHint}</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button key={g.key} type="button" onClick={() => onRate(g.grade)} className={`min-h-12 rounded-xl border-2 bg-surface px-2 font-semibold ${g.style}`}>
                {t.flash[g.key]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResultIcon({ ok }: { ok: boolean }) {
  return ok ? <CheckCircle size={20} weight="fill" aria-hidden /> : <XCircle size={20} aria-hidden />;
}
