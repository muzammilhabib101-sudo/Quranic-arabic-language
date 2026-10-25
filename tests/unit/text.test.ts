import { describe, expect, it } from "vitest";
import { normalize } from "@/lib/arabic";
import { fill, formatNumber } from "@/i18n/format";

describe("normalize", () => {
  it("drops harakat and Quranic marks so vowelled and bare words match", () => {
    expect(normalize("ٱلرَّحِيمِ")).toBe(normalize("الرحيم"));
    expect(normalize("رَحِيمٌ")).toBe("رحيم");
  });

  it("merges alef forms, ya/alef maqsura and ta marbuta", () => {
    expect(normalize("إِلَىٰٓ")).toBe(normalize("الي"));
    expect(normalize("رَحْمَة")).toBe(normalize("رحمه"));
  });

  it("matches Urdu spellings of Arabic letters", () => {
    expect(normalize("رحیم")).toBe(normalize("رحيم"));
    expect(normalize("کتاب")).toBe(normalize("كتاب"));
  });

  it("lower-cases Latin text and collapses spaces", () => {
    expect(normalize("  Most   Merciful ")).toBe("most merciful");
  });
});

describe("fill and formatNumber", () => {
  it("uses Urdu digits in Urdu and Western digits in English", () => {
    expect(formatNumber(521, "ur")).toBe("۵۲۱");
    expect(formatNumber(521, "en")).toBe("521");
  });

  it("replaces placeholders and localises numbers only", () => {
    expect(fill("Slide {k} of {total}", "en", { k: 3, total: 10 })).toBe("Slide 3 of 10");
    expect(fill("سلائیڈ {k}", "ur", { k: 3 })).toBe("سلائیڈ ۳");
    expect(fill("Visit {name}", "ur", { name: "Tanzil 3" })).toBe("Visit Tanzil 3");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(fill("{a} and {b}", "en", { a: "x" })).toBe("x and {b}");
  });
});
