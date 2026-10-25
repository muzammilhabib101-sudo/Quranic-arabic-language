// Runs after `next build` (npm "postbuild").
//
// On Windows, Next.js writes the router's prefetch files as nested folders
// (out/ur/__next.$d$lang/slides/$d$n/__PAGE__.txt) because it splits paths on
// "\" — but the browser requests flat names (__next.$d$lang.slides.$d$n.__PAGE__.txt),
// so every prefetch 404s. This flattens them. On Linux it finds nothing to do.

import { readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

const OUT = new URL("../out/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

async function filesUnder(dir, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}.${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...(await filesUnder(join(dir, entry.name), rel)));
    else found.push({ from: join(dir, entry.name), rel });
  }
  return found;
}

let moved = 0;

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      for (const file of await filesUnder(path)) {
        await rename(file.from, join(dir, `${entry.name}.${file.rel}`));
        moved++;
      }
      await rm(path, { recursive: true });
    } else if (entry.name !== "_next") {
      await walk(path);
    }
  }
}

await walk(OUT);
console.log(`fix-export-segments: flattened ${moved} prefetch files`);
