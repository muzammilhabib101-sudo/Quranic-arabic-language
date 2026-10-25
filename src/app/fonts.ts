import { Amiri, Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import localFont from "next/font/local";

// next/font self-hosts these at build time — visitors never contact Google.

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

// KFGQPC Uthmanic Hafs (King Fahd Glorious Quran Printing Complex).
// Only for the KFGQPC Hafs text in content/quran — Tanzil text renders
// incorrectly in this font.
const hafs = localFont({
  src: "./fonts/UthmanicHafs1Ver18.woff2",
  variable: "--font-hafs",
  display: "swap",
});

export const fontVariables = [
  inter.variable,
  nastaliq.variable,
  amiri.variable,
  hafs.variable,
].join(" ");
