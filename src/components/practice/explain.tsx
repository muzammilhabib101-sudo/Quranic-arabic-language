import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Item, Lang, PracticeData, PracticeWord } from "@/lib/practice/types";

type T = Dictionary["practice"];
export type Value = string | { ar: string; font?: "quran" | "arabic" };

/** Like `fill`, but values can be Arabic, rendered in the right font. */
export function rich(template: string, values: Record<string, Value>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    if (!m) return part;
    const v = values[m[1]];
    if (v === undefined) return part;
    if (typeof v === "string") return v;
    return (
      <span key={i} lang="ar" dir="rtl" className={`${v.font ?? "quran"} text-[1.25em]`}>
        {v.ar}
      </span>
    );
  });
}

const meaning = (w: PracticeWord, lang: Lang) => w.m[lang] || w.m.ur;

/** The label and meaning of one corpus segment: "و (and)". */
export function segLabel(seg: NonNullable<PracticeWord["segs"]>[number], t: T) {
  const prefixes = t.seg.prefixes as Record<string, string>;
  const persons = t.seg.persons as Record<string, string>;
  if (seg.k === "pre" && seg.lemma && prefixes[seg.lemma]) return prefixes[seg.lemma];
  if (seg.k === "suf" && seg.pron && seg.person && persons[seg.person]) return persons[seg.person];
  return null;
}

/** The explanation shown after any answer — right or wrong. */
export function explain(
  item: Item,
  data: PracticeData,
  lang: Lang,
  t: T,
  roles: Dictionary["home"]["roles"],
): ReactNode[] {
  const e = t.exp;
  switch (item.type) {
    case "meaning":
      return rich(e.meaning, { ar: { ar: item.word.ar }, m: meaning(item.word, lang) });
    case "listen":
      return rich(e.listen, { ar: { ar: item.word.ar }, m: meaning(item.word, lang) });
    case "fill":
      return rich(e.fill, { ar: { ar: item.word.ar }, m: meaning(item.word, lang) });
    case "root": {
      const w = item.word;
      const others = [...new Set(data.words.filter((x) => x.root === w.root && x.ar !== w.ar).map((x) => x.ar))].slice(0, 4);
      const out = rich(e.root, { ar: { ar: w.ar }, root: { ar: w.root!, font: "arabic" } });
      if (others.length) {
        out.push(" ");
        out.push(
          ...rich(e.sameRoot, { list: "" }).slice(0, -1),
          ...others.flatMap((ar, i) => [
            i ? "، " : "",
            <span key={ar} lang="ar" className="quran text-[1.25em]">
              {ar}
            </span>,
          ]),
          ...rich(e.sameRoot, { list: "" }).slice(-1),
        );
      }
      return out;
    }
    case "pattern": {
      const p = data.patterns[item.word.pattern!];
      return rich(e.pattern, {
        ar: { ar: item.word.ar },
        p: { ar: p.ar, font: "arabic" },
        pm: p.meaning[lang],
      });
    }
    case "role":
      return [
        ...rich(e.role, { ar: { ar: item.word.ar }, role: roles[item.word.role] }),
        " ",
        e.roles[item.word.role],
      ];
    case "match":
      return [e.match];
    case "translate":
      return rich(e.translate, { list: item.words.map((w) => meaning(w, lang)).join(" · ") });
    case "anatomy": {
      const parts: ReactNode[] = [];
      item.word.segs!.forEach((s, i) => {
        if (i) parts.push(" + ");
        const label = segLabel(s, t);
        parts.push(
          <span key={i}>
            <span lang="ar" className="arabic text-[1.25em]">
              {s.t}
            </span>{" "}
            ({t.seg[s.k]}
            {label ? `: ${label}` : ""})
          </span>,
        );
      });
      return [...rich(e.anatomy, { ar: { ar: item.word.ar }, parts: "" }).slice(0, -1), ...parts];
    }
    case "flashcard":
      return [];
  }
}
