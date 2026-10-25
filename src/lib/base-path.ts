/**
 * The sub-path the site is served under ("" at a domain root, "/repo" on
 * GitHub Pages). Set by BASE_PATH at build time — see next.config.ts.
 * next/link adds it by itself; everything else that names a file by its
 * absolute path (audio, images, fetches) goes through `asset()`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
