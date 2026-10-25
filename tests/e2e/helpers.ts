import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export const readJson = <T = unknown>(path: string): T => JSON.parse(readFileSync(path, "utf8"));

/** Fails the test on any console error, uncaught exception or failed request. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`exception: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  return () => expect(errors).toEqual([]);
}

const CHECK = /^(جانچیں|Check)$/;
const NEXT = /^(آگے|Next|مکمل کریں|Finish)$/;
const DONE = /مشق مکمل|Practice complete/;

/**
 * Answers whatever practice exercise is showing; the answer itself doesn't
 * matter. Returns false for a flashcard, whose rating moves on by itself.
 */
async function answerOne(page: Page) {
  const main = page.locator("main");
  const flash = main.getByRole("button", { name: /جواب دیکھیں|Show answer/ });
  if (await flash.count()) {
    await flash.click();
    await main.getByRole("button", { name: /^(ٹھیک|Good)$/ }).click();
    return false;
  }
  if (await page.getByText(/پہلے لفظ پر ٹیپ|Tap a word, then/).count()) {
    const words = main.locator("button[aria-pressed]").filter({ has: page.locator(".quran") });
    const meanings = main.locator("ul").nth(1).locator("button");
    for (let i = 0; i < (await words.count()); i++) {
      await words.nth(i).click();
      await meanings.nth(i).click();
    }
    await main.getByRole("button", { name: CHECK }).click();
  } else if (await main.locator("[role=radiogroup]").count()) {
    const groups = main.locator("[role=radiogroup]");
    for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).locator("button").first().click();
    await main.getByRole("button", { name: CHECK }).click();
  } else if (await page.getByText(/آپ کی ترتیب|Your order/).count()) {
    const check = main.getByRole("button", { name: CHECK });
    while (await check.isDisabled()) await main.locator("ul.flex-wrap > li > button").first().click();
    await check.click();
  } else {
    await main.locator("div.grid > button").first().click();
  }
  // Every answer, right or wrong, is explained.
  await expect(page.getByRole("status")).toBeVisible();
  return true;
}

/** Plays a practice session to the end; returns how many exercises it had. */
export async function playPractice(page: Page) {
  await page.waitForSelector("#ex-prompt");
  let n = 0;
  while (!(await page.getByRole("heading", { name: DONE }).count())) {
    expect(++n, "practice session never ended").toBeLessThan(40);
    if (await answerOne(page)) await page.locator("main").getByRole("button", { name: NEXT }).click();
  }
  return n;
}
