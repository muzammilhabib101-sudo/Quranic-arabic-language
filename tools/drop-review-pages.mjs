// Runs after `next build` (npm "postbuild"), before Pagefind indexes the site.
//
// The review pages (/ur/review/, /en/review/) are a working tool for the owner
// and proofreaders, so they stay out of the published site. `npm run dev`
// always has them; to keep them in a build (e.g. a private preview for a
// teacher) run the build with REVIEW=1.

import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

if (process.env.REVIEW === "1") {
  console.log("Review pages kept (REVIEW=1).");
} else {
  let removed = 0;
  for (const entry of await readdir(OUT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(OUT, entry.name, "review");
    if (entry.name.startsWith("_")) continue;
    try {
      await rm(dir, { recursive: true });
      removed++;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  console.log(`Review pages left out of the build (${removed} language${removed === 1 ? "" : "s"}). Use REVIEW=1 to keep them.`);
}
