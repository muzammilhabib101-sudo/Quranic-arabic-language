"use client";

import { useEffect } from "react";
import { useStore, type Settings } from "@/lib/store";

const ATTRS: Record<Exclude<keyof Settings, "transliteration">, string> = {
  largeText: "data-large-text",
  highContrast: "data-high-contrast",
  reducedMotion: "data-reduced-motion",
};

/** Mirrors the comfort settings onto <html> so CSS can react to them. */
export default function SettingsEffect() {
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, attr] of Object.entries(ATTRS)) {
      root.toggleAttribute(attr, settings[key as keyof typeof ATTRS]);
    }
  }, [settings]);

  return null;
}

/**
 * Inline script for <head>: applies saved settings before first paint so
 * large text or high contrast never flashes in after load.
 */
export const settingsScript = `(function(){try{var s=JSON.parse(localStorage.getItem("qa-store")).state.settings,r=document.documentElement;${Object.entries(
  ATTRS,
)
  .map(([k, a]) => `if(s.${k})r.setAttribute("${a}","")`)
  .join(";")}}catch(e){}})()`;
