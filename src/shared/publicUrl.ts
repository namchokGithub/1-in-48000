/// <reference types="vite/client" />

/**
 * Resolves a site path such as `/assets/scene/x.png` or `/content-v2/x.json`
 * against the deploy base. The local dev server and BO use base `/`; GitHub
 * Pages serves the Player under `/1-in-48000/` (see vite.config.ts).
 * Full URLs are returned unchanged.
 */
export function publicUrl(path: string): string {
  if (/^([a-z]+:|\/\/)/i.test(path)) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
