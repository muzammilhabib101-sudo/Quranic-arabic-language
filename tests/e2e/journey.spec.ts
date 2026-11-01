import { expect, test } from "@playwright/test";
import { playPractice, readJson, watchErrors } from "./helpers";

type Lesson = { words: unknown[]; check: { answer: number }[] };
type Verses = Record<string, { w: { p: number; ar: string }[] }>;

const lesson = readJson<Lesson>("content/lessons/u1-l1.json");
const ur = readJson<{ practice: { dueOne: string } }>("src/i18n/messages/ur.json");
const savedWord = readJson<Verses>("content/quran/words/001.json")["1"].w[3]; // ٱلرَّحِيمِ

// The acceptance journey: a new visitor, no account.
test("switch to Urdu, finish the Bismillah lesson, save a word and review it", async ({ page }) => {
  const noErrors = watchErrors(page);

  await page.goto("/en/");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByRole("link", { name: "Change language to Urdu" }).click();
  await expect(page).toHaveURL(/\/ur\/$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  // Lesson page → player
  await page.goto("/ur/lesson/u1-l1/");
  // Reviewed by a teacher, so no draft badge.
  await expect(page.getByText("مسودہ · نظرِ ثانی باقی")).toHaveCount(0);
  await page.getByRole("link", { name: "سبق شروع کریں" }).click();
  await expect(page).toHaveURL(/\/learn\/$/);

  const next = page.locator("main").getByRole("button", { name: "آگے" });
  await next.click();
  await next.click();

  // Step 3: every word of the verse, each one opens a sheet that can save it
  const chips = page.locator("main ul[dir=rtl] button");
  await expect(chips).toHaveCount(lesson.words.length);
  await chips.nth(3).click();
  const sheet = page.locator("dialog[open]");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "لفظ محفوظ کریں" }).click();
  await expect(sheet.getByRole("button", { name: "محفوظ ہے" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);

  // Progress survives a reload mid-lesson
  const step = await page.locator("#step-title").innerText();
  await page.reload();
  await expect(page.locator("#step-title")).toHaveText(step);

  await next.click();
  await next.click();
  await next.click();

  // Step 6: quick check
  for (const q of lesson.check) {
    await page.locator("fieldset button").nth(q.answer).click();
    await expect(page.getByRole("status")).toContainText("درست");
    await page.locator("main").getByRole("button", { name: /اگلا سوال|سبق مکمل کریں/ }).click();
  }
  await expect(page.getByRole("heading", { name: "سبق مکمل" })).toBeVisible();

  // Saved words
  await page.goto("/ur/me/");
  await expect(page.locator("#saved-title").locator("..")).toContainText(savedWord.ar);

  // The saved word is waiting in the review queue
  await page.goto("/ur/practice/");
  await expect(page.locator("#today-title").locator("..")).toContainText(ur.practice.dueOne);
  await page.goto("/ur/practice/review/today/");
  await expect(page.locator("main")).toContainText(savedWord.ar);
  await playPractice(page);

  // The lesson's practice set
  await page.goto("/ur/practice/lesson/u1-l1/");
  expect(await playPractice(page)).toBeGreaterThanOrEqual(4);

  // Progress is computed from what was done
  await page.goto("/ur/course/");
  await expect(page.locator('a[href="/ur/lesson/u1-l1/"]').first()).toContainText("مکمل");

  noErrors();
});
