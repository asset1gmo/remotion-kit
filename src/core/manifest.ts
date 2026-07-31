/**
 * The bundle contract shared by the two modes.
 *
 * The compressor (`src/compressor/`, Node) writes `manifest.json` into each zip;
 * the loader (`src/remotion/`, browser) reads it back. Keeping the shape and the
 * asset-module constant here — imported by both — is what stops them drifting
 * apart. Neither this file nor anything it imports pulls in a backend, so it is
 * safe to include from either mode without bloating the other's bundle.
 */

/** Current bundle layout. Bump when the zip format changes incompatibly. */
export const BUNDLE_FORMAT = 1;

/**
 * Virtual module the compressor rewrites image imports to, and the loader
 * intercepts at evaluation time to hand back a blob URL:
 *
 *   `import url from "./images/x.png"`
 *      -> `import { asset } from "<ASSET_MODULE>"; export default asset("images/x.png")`
 *
 * It is marked external in the build and never resolved by a real bundler, so it
 * only has to be a stable, collision-proof string.
 */
export const ASSET_MODULE = "@asset1gmo/remotion-kit/asset";

/** External specifiers an animation bundle is allowed to `require` at load. */
export const RUNTIME_EXTERNALS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "remotion",
  ASSET_MODULE,
] as const;

/**
 * Display/timing metadata authored per animation (the subset a human writes in
 * `manifest.json`). The Player needs size + timing *before* the bundle runs,
 * which is why they are data, not a JS export inside the composition.
 */
export type AnimationMeta = {
  id: string;
  name?: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  /** Fonts the composition draws with — see {@link AnimationFont}. */
  fonts?: AnimationFont[];
};

/**
 * A webfont a composition draws with.
 *
 * Compositions position `<text>` at absolute coordinates measured for a specific
 * face. Laid out against a fallback — even for the moment before the real font
 * arrives — glyph advances differ enough that labels overrun their boxes and
 * anything past the viewBox edge is clipped. So an animation has to *declare*
 * what it needs, and the loader has to have it in hand before the composition
 * renders at all.
 *
 * Declared here rather than passed in by the caller on purpose: a consuming app
 * has no business knowing that one animation happens to draw in Poppins 600.
 * Carrying it in the manifest means the dependency travels with the zip and
 * cannot be forgotten when the animation is reused somewhere else.
 */
export type AnimationFont = {
  /** CSS family name, exactly as the composition names it. */
  family: string;
  /**
   * URL of a font file — typically a CDN `.woff2`. Kept as a URL rather than
   * packed into the zip so bundles stay a couple of KB and one fetch serves
   * every animation on the page.
   */
  src: string;
  /** Defaults to `"400"`. */
  weight?: string;
  /** Defaults to `"normal"`. */
  style?: string;
};

/** Full manifest stored inside every zip: the authored meta plus build output. */
export type AnimationManifest = AnimationMeta & {
  /** Bundle layout version — see {@link BUNDLE_FORMAT}. */
  format: number;
  /** Entry filename inside the zip (the CJS bundle). */
  entry: string;
  /** Asset ids inside the zip (e.g. `"images/cursor.png"`), resolved to blob URLs at load. */
  assets: string[];
  /** Runtime the bundle was built against — checked for compatibility on load. */
  runtime: { remotion: string };
};
