/**
 * Compressor mode — the Node entry (`@asset1gmo/remotion-kit/compress`).
 *
 * Import this in your build tooling to turn authored Remotion compositions into
 * portable zips. It pulls in `esbuild` and is Node-only; it shares nothing with
 * the loader entry beyond the manifest contract, so importing it never drags the
 * loader (or Remotion) into your build, and importing the loader never drags
 * `esbuild` into your app.
 */
export { compressAnimation, buildAnimations, } from "./compressor/compress.js";
export { BUNDLE_FORMAT, ASSET_MODULE, RUNTIME_EXTERNALS, } from "./core/manifest.js";
