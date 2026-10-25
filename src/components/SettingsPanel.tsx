"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import {
  BookmarkSimple,
  DownloadSimple,
  ShieldCheck,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { locales, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { fill } from "@/i18n/format";
import { exportData, today, useHydrated, useStore, type Settings } from "@/lib/store";

const LANGUAGE_NAMES: Record<Locale, string> = { ur: "اردو", en: "English" };

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "largeText", label: "largeText", hint: "largeTextHint" },
  { key: "highContrast", label: "highContrast", hint: "highContrastHint" },
  { key: "reducedMotion", label: "reducedMotion", hint: "reducedMotionHint" },
  { key: "transliteration", label: "transliteration", hint: "transliterationHint" },
];

export default function SettingsPanel({
  lang,
  t,
  lessonTitles,
}: {
  lang: Locale;
  t: Dictionary["me"];
  lessonTitles: Record<string, string>;
}) {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const savedWords = useStore((s) => s.savedWords);
  const toggleWord = useStore((s) => s.toggleWord);
  const words = hydrated ? savedWords : [];
  const setSetting = useStore((s) => s.setSetting);
  const importData = useStore((s) => s.importData);
  const resetProgress = useStore((s) => s.resetProgress);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function download() {
    const blob = new Blob([JSON.stringify({ app: "quranic-arabic", ...exportData() }, null, 1)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quranic-arabic-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let ok = false;
    try {
      ok = importData(JSON.parse(await file.text()));
    } catch {
      ok = false;
    }
    setMessage({ ok, text: ok ? t.importOk : t.importBad });
  }

  function reset() {
    if (!window.confirm(t.resetConfirm)) return;
    resetProgress();
    setMessage({ ok: true, text: t.resetDone });
  }

  const card = "rounded-2xl border border-border bg-surface p-5";
  const button =
    "inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="lang-title" className={card}>
        <h2 id="lang-title" className="mb-3 font-semibold">
          {t.language}
        </h2>
        <div className="flex gap-2">
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}/me/`}
              lang={l}
              aria-current={l === lang ? "true" : undefined}
              onClick={() => {
                try {
                  localStorage.setItem(LOCALE_STORAGE_KEY, l);
                } catch {
                  // Storage blocked — the link still switches language.
                }
              }}
              className={`min-h-11 flex-1 content-center rounded-xl border px-4 text-center ${
                l === lang
                  ? "border-accent bg-accent/10 font-semibold text-accent"
                  : "border-border hover:border-accent"
              }`}
            >
              {LANGUAGE_NAMES[l]}
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="comfort-title" className={card}>
        <h2 id="comfort-title" className="mb-1 font-semibold">
          {t.comfort}
        </h2>
        <ul>
          {TOGGLES.map(({ key, label, hint }) => {
            const on = hydrated && settings[key];
            const id = `toggle-${key}`;
            return (
              <li key={key} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
                <div>
                  <p id={id} className="font-medium">
                    {t[label as keyof typeof t]}
                  </p>
                  <p className="text-sm text-muted">{t[hint as keyof typeof t]}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={id}
                  disabled={!hydrated}
                  onClick={() => setSetting(key, !settings[key])}
                  // 44px-tall hit area around a 32px track
                  className="grid h-11 w-14 shrink-0 place-items-center"
                >
                  <span
                    aria-hidden
                    className={`relative h-8 w-14 rounded-full border transition-colors ${
                      on ? "border-accent-2 bg-accent-2" : "border-border bg-surface-2"
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-6 rounded-full bg-text transition-[inset-inline-start] ${
                        on ? "start-7" : "start-1"
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="saved-title" className={card}>
        <h2 id="saved-title" className="mb-3 flex items-center gap-2 font-semibold">
          <BookmarkSimple size={22} className="text-accent" aria-hidden />
          {t.savedWords}
        </h2>
        {words.length === 0 ? (
          <p className="text-sm text-muted">{t.savedEmpty}</p>
        ) : (
          <ul>
            {words.map((w) => (
              <li key={w.id} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                <span lang="ar" className="quran shrink-0 text-3xl leading-[1.6]">
                  {w.ar}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {lang === "en" ? (w.meaning.en ?? w.meaning.ur) : w.meaning.ur}
                  </span>
                  {lessonTitles[w.lessonId] && (
                    <Link href={`/${lang}/lesson/${w.lessonId}/`} className="text-sm text-muted hover:text-accent">
                      {fill(t.fromLesson, lang, { lesson: lessonTitles[w.lessonId] })}
                    </Link>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleWord(w)}
                  className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-sm hover:border-wrong hover:text-wrong"
                >
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="backup-title" className={card}>
        <h2 id="backup-title" className="mb-1 font-semibold">
          {t.backup}
        </h2>
        <p className="mb-4 text-sm text-muted">{t.backupHint}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} disabled={!hydrated} className={button}>
            <DownloadSimple size={20} aria-hidden />
            {t.export}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!hydrated} className={button}>
            <UploadSimple size={20} aria-hidden />
            {t.import}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={upload}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
          <button
            type="button"
            onClick={reset}
            disabled={!hydrated}
            className={`${button} hover:border-wrong hover:text-wrong`}
          >
            <Trash size={20} aria-hidden />
            {t.reset}
          </button>
        </div>
        <p
          role="status"
          className={`mt-3 min-h-6 text-sm ${message?.ok === false ? "text-wrong" : "text-accent-2"}`}
        >
          {message?.text}
        </p>
      </section>

      <section aria-labelledby="privacy-title" className={`${card} flex items-start gap-4`}>
        <ShieldCheck size={26} className="shrink-0 text-accent-2" aria-hidden />
        <div>
          <h2 id="privacy-title" className="font-semibold">
            {t.privacyTitle}
          </h2>
          <p className="text-sm text-muted">{t.privacy}</p>
        </div>
      </section>
    </div>
  );
}
