/**
 * Company logos: checking uploads, and the initials tile shown for companies without one.
 * Pure functions, so they can be tested.
 */

/** Uploads are resized in the browser to about 256px, so anything bigger than this wasn't. */
export const MAX_LOGO_BYTES = 300 * 1024;
/** Longest side, in pixels, that the browser resizes a logo to before uploading it. */
export const LOGO_SIZE = 256;

export type LogoType = "image/png" | "image/jpeg" | "image/webp";

/** The image type from the file's first bytes, or null if it isn't a PNG, JPEG or WebP. */
export function detectLogoType(bytes: Uint8Array): LogoType | null {
  const at = (i: number, ...b: number[]) => b.every((v, j) => bytes[i + j] === v);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

/** Up to two letters for a company: "Old School" → "OS", "Braamfontein Digital (demo)" → "BD". */
export function companyInitials(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .filter((w, i, all) => all.length < 2 || !/^(the|and|of|pty|ltd|inc|cc)$/i.test(w));
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const TILE_COLOURS = ["#1f5c4f", "#3b6ea5", "#8a4f7d", "#a0522d", "#4b5d2a", "#5b4fa0", "#256d85", "#8c3b3b"];

/** A stable colour for a company, so its tile looks the same everywhere. */
export function tileColour(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TILE_COLOURS[h % TILE_COLOURS.length];
}

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The square initials tile, as SVG. */
export function initialsSvg(name: string, id: string): string {
  const text = escapeXml(companyInitials(name));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${tileColour(id)}"/><text x="48" y="50" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">${text}</text></svg>`;
}
