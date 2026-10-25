"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

const SPEEDS = [0.75, 1, 1.25];

/** Verse recitation with play/pause and three speeds. */
export default function AudioPlayer({
  src,
  labels,
}: {
  src: string;
  labels: { play: string; pause: string; speed: string; reciter: string };
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  function changeRate(r: number) {
    setRate(r);
    if (ref.current) ref.current.playbackRate = r;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={(e) => {
          e.currentTarget.playbackRate = rate;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-accent-ink hover:opacity-90"
      >
        {playing ? <Pause size={20} weight="fill" aria-hidden /> : <Play size={20} weight="fill" aria-hidden />}
        {playing ? labels.pause : labels.play}
      </button>
      <div role="group" aria-label={labels.speed} className="flex overflow-hidden rounded-xl border border-border">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={rate === s}
            onClick={() => changeRate(s)}
            className={`min-h-11 min-w-14 px-3 text-sm ${
              rate === s ? "bg-surface-2 font-semibold text-accent" : "text-muted hover:text-text"
            }`}
          >
            <span dir="ltr">{s}×</span>
          </button>
        ))}
      </div>
      <p className="w-full text-sm text-muted">{labels.reciter}</p>
    </div>
  );
}
