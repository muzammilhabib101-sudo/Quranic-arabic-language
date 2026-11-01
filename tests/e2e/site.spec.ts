import { expect, test } from "@playwright/test";
import { playPractice, readJson, watchErrors } from "./helpers";

type CourseMap = { lessons: { id: string; sourceSlides: { from: number; to: number } }[] };
const map = readJson<CourseMap>("content/course-map.json");
const slideCount = readJson<{ count: number }>("content/slides.json").count;

test("/ sends a new visitor to Urdu", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ur\/$/);
});

test("switching language flips direction and strings but not the Arabic", async ({ page }) => {
  const noErrors = watchErrors(page);
  await page.goto("/ur/lesson/u2-l3/");
  const verse = await page.locator(".quran").first().innerText();
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page.getByRole("link", { name: "زبان انگریزی میں بدلیں" }).click();
  await expect(page).toHaveURL(/\/en\/lesson\/u2-l3\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator(".quran").first()).toHaveText(verse);
  noErrors();
});

test("the course page links every lesson, and every lesson links its slides", async ({ page }) => {
  await page.goto("/en/course/");
  for (const l of map.lessons) {
    await expect(page.locator(`a[href="/en/lesson/${l.id}/"]`).first()).toBeAttached();
  }
  await page.goto("/en/lesson/u2-l3/");
  const { from } = map.lessons.find((l) => l.id === "u2-l3")!.sourceSlides;
  await expect(page.locator(`a[href="/en/slides/${from}/"]`).first()).toBeAttached();
});

test("every slide page and image is published", async ({ request }) => {
  for (let n = 1; n <= slideCount; n++) {
    const file = String(n).padStart(3, "0");
    expect((await request.get(`/ur/slides/${n}/`)).status(), `slide ${n}`).toBe(200);
    expect((await request.head(`/slides/${file}.webp`)).status(), `image ${n}`).toBe(200);
  }
});

test("slides move with the arrow keys (mirrored in Urdu)", async ({ page }) => {
  // The key listener is attached after hydration, so wait for the page to settle.
  await page.goto("/ur/slides/1/", { waitUntil: "networkidle" });
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/\/ur\/slides\/2\/$/);
  await page.goto("/en/slides/2/", { waitUntil: "networkidle" });
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/\/en\/slides\/1\/$/);
});

test("review pages are not published", async ({ request }) => {
  expect((await request.get("/ur/review/")).status()).toBe(404);
  expect((await request.get("/en/review/u1-l1/")).status()).toBe(404);
});

test("the footer links to the credits, which name the Quran sources", async ({ page }) => {
  await page.goto("/en/");
  await page.locator("footer").getByRole("link", { name: "Credits" }).click();
  await expect(page).toHaveURL(/\/en\/credits\/$/);
  await expect(page.locator("main")).toContainText("Tanzil Quran Text");
  await expect(page.getByRole("link", { name: "Visit Quranic Arabic Corpus" })).toHaveAttribute("href", "https://corpus.quran.com");
});

test("search finds a word in both scripts", async ({ page }) => {
  await page.goto("/en/search/");
  await page.getByRole("searchbox").fill("رحيم");
  await expect(page.locator("main")).toContainText(/Bismillah|بسم/);
});

test("a practice link can open on one exercise", async ({ page }) => {
  await page.goto("/ur/practice/lesson/u2-l2/?word=49:2:5&type=match");
  await expect(page.getByText(/پہلے لفظ پر ٹیپ/)).toBeVisible();
  await expect(page.locator("main")).toContainText("تم سب بلند کرو");
});

// Every practice set ends with a way forward, beside "practise again".
const NEXT_STEPS: [string, RegExp, RegExp][] = [
  ["/ur/practice/lesson/u2-l2/", /اگلے سبق کی مشق کریں/, /\/ur\/practice\/lesson\/u2-l3\/$/],
  ["/ur/practice/lesson/u4-l17/", /اس یونٹ کی دہرائی کریں/, /\/ur\/practice\/unit\/u4\/$/],
  ["/ur/practice/unit/u1/", /اگلے یونٹ کا جائزہ لیں/, /\/ur\/practice\/unit\/u2\/$/],
  ["/ur/practice/unit/u4/", /دہرائی شروع کریں/, /\/ur\/practice\/review\/today\/$/],
  ["/ur/practice/mode/match/", /اگلی قسم کی مشق کریں/, /\/ur\/practice\/mode\/(?!match\/)[a-z]+\/$/],
];

for (const [url, button, target] of NEXT_STEPS) {
  test(`finishing ${url} offers the next step`, async ({ page }) => {
    await page.goto(url);
    await playPractice(page);
    await expect(page.getByRole("button", { name: "دوبارہ مشق کریں" })).toBeVisible();
    await page.getByRole("link", { name: button }).click();
    await expect(page).toHaveURL(target);
    expect(page.url()).not.toContain(url);
  });
}

test("finishing today's review leads to the learner's own lesson", async ({ page }) => {
  await page.goto("/ur/");
  await page.evaluate(() =>
    localStorage.setItem(
      "qa-store",
      JSON.stringify({
        version: 1,
        state: {
          lessons: { "u2-l5": { seen: [], step: 2, steps: 6 } },
          lastLesson: "u2-l5",
          activeDays: [],
          cards: { "49:5:1": { due: "2026-01-01T00:00:00.000Z", stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0, state: 0 } },
        },
      }),
    ),
  );
  await page.goto("/ur/practice/review/today/");
  await playPractice(page);
  await page.getByRole("link", { name: /اپنے سبق کی مشق کریں/ }).click();
  await expect(page).toHaveURL(/\/ur\/practice\/lesson\/u2-l5\/$/);
});

test("?preview=done shows the finished screen without recording anything", async ({ page }) => {
  await page.goto("/ur/practice/mode/flashcard/?preview=done");
  await expect(page.getByText("یہ صرف پیش نظارہ ہے")).toBeVisible();
  await expect(page.getByRole("link", { name: /اگلی قسم کی مشق کریں/ })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("qa-store") ?? "{}").state ?? {});
  expect(stored.practice?.answered ?? 0).toBe(0);

  // "Practise again" from a preview starts a real set.
  await page.getByRole("button", { name: "دوبارہ مشق کریں" }).click();
  await expect(page.locator("#ex-prompt")).toBeVisible();
  await expect(page).toHaveURL(/\/flashcard\/$/);
});

test("?preview=done works for today's review even with nothing due", async ({ page }) => {
  await page.goto("/ur/practice/review/today/?preview=done");
  await expect(page.getByText("یہ صرف پیش نظارہ ہے")).toBeVisible();
  await expect(page.getByRole("link", { name: /اپنے سبق کی مشق کریں/ })).toBeVisible();
});
