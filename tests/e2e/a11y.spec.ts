import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "",
  "course/",
  "lesson/u1-l1/",
  "lesson/u2-l3/learn/",
  "practice/",
  "practice/lesson/u1-l1/",
  "practice/mode/match/",
  "words/",
  "me/",
  "progress/",
  "search/",
  "slides/1/",
  "credits/",
];

const scan = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze()
    .then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));

for (const lang of ["ur", "en"]) {
  for (const path of PAGES) {
    test(`/${lang}/${path} has no accessibility violations`, async ({ page }) => {
      // The Dictionary lists every word of the course; scanning it takes ~20s alone.
      if (path === "words/") test.slow();
      await page.goto(`/${lang}/${path}`);
      await page.waitForLoadState("networkidle");
      expect(await scan(page)).toEqual([]);
    });
  }

  test(`/${lang}/ open word sheet has no accessibility violations`, async ({ page }) => {
    await page.goto(`/${lang}/lesson/u2-l3/learn/`);
    const next = page.locator("main").getByRole("button", { name: lang === "ur" ? "آگے" : "Continue" });
    await next.click();
    await next.click();
    await page.locator("main ul[dir=rtl] button").first().click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
}

test("comfort settings change the page and survive a reload", async ({ page }) => {
  await page.goto("/en/me/");
  const html = page.locator("html");
  const size = () => page.locator("main h1").evaluate((h) => parseFloat(getComputedStyle(h).fontSize));
  const before = await size();
  for (const name of [/large text/i, /reduce motion/i]) {
    await page.getByRole("switch", { name }).click();
  }
  await expect(html).toHaveAttribute("data-large-text", "");
  expect(await size()).toBeGreaterThan(before);
  await page.reload();
  await expect(html).toHaveAttribute("data-large-text", "");
  await expect(html).toHaveAttribute("data-reduced-motion", "");
});
