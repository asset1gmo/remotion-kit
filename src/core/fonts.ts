import type { AnimationFont } from "./manifest.js";

/**
 * Make an animation's declared fonts usable *before* it renders.
 *
 * Text laid out against a fallback keeps that fallback's metrics, so a
 * composition that paints even one frame before its font arrives comes out with
 * labels overrunning their boxes. Awaiting here — inside the async prepare step
 * that already gates mounting — means the composition only ever lays out once,
 * against the real face.
 *
 * Two things keep this cheap:
 *
 *  - **The host's copy wins.** If the page already declares the family (an app
 *    with its own `@font-face`, or a second animation that got here first),
 *    nothing is fetched; we just wait for what is already on its way. In an app
 *    that already ships the font this costs no bytes and no requests at all.
 *  - **One fetch per face.** Results are memoised by family/weight/style/src, so
 *    ten animations declaring the same font produce one download between them.
 */

/** In-flight or settled loads, keyed by face. */
const inFlight = new Map<string, Promise<void>>();

const keyOf = (font: AnimationFont): string =>
  `${font.family}|${font.weight ?? "400"}|${font.style ?? "normal"}|${font.src}`;

/** Strip the quotes `FontFace.family` round-trips through. */
const bare = (family: string): string => family.replace(/^['"]|['"]$/g, "");

/**
 * Whether the document already declares this family/weight.
 *
 * Deliberately inspects the registered `FontFace`s rather than calling
 * `document.fonts.check()`, which answers about the *resolved* font and returns
 * true for a fallback — it will happily tell you a font you have never loaded is
 * available.
 */
function alreadyDeclared(font: AnimationFont): boolean {
  const family = bare(font.family);
  const weight = String(font.weight ?? "400");
  for (const face of document.fonts) {
    if (bare(face.family) !== family) continue;
    // A variable face covers a range ("100 900") and satisfies any weight in it.
    if (face.weight === weight || face.weight.includes(" ")) return true;
  }
  return false;
}

async function loadOne(font: AnimationFont): Promise<void> {
  const weight = String(font.weight ?? "400");
  const style = font.style ?? "normal";
  const spec = `${style} ${weight} 16px "${bare(font.family)}"`;

  if (!alreadyDeclared(font)) {
    const face = new FontFace(bare(font.family), `url(${font.src})`, {
      weight,
      style,
    });
    document.fonts.add(await face.load());
    return;
  }

  // Declared by the host (or by an earlier animation) — just wait for it.
  await document.fonts.load(spec);
}

/**
 * Resolve every declared font, or give up quietly.
 *
 * A font that will not load is a degraded animation, not a broken page, so a
 * failure here must never stop it mounting — the composition still renders, just
 * with the wrong metrics, which is strictly better than rendering nothing.
 */
export async function ensureFonts(
  fonts: AnimationFont[] | undefined,
): Promise<void> {
  if (!fonts?.length || typeof document === "undefined") return;

  await Promise.all(
    fonts.map((font) => {
      const key = keyOf(font);
      let pending = inFlight.get(key);
      if (!pending) {
        pending = loadOne(font).catch((error: unknown) => {
          console.warn(
            `[remotion-animation] could not load font "${font.family}" from ${font.src}; the animation will render with fallback metrics`,
            error,
          );
        });
        inFlight.set(key, pending);
      }
      return pending;
    }),
  );
}
