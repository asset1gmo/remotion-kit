/**
 * LOTTIE (TEMPORARY) — opt-in engine registration, on a **separate entry**
 * (`@asset1gmo/remotion-kit/lottie`) on purpose.
 *
 * Importing this statically pulls in lottie-web, which touches `document` at
 * import time. Keeping it off the main entry means importing `unzipAnimation` /
 * `loadAnimation` never evaluates lottie-web — so the main entry is SSR-safe and
 * a URL-only consumer keeps lottie-web lazy (loaded via `unzipAnimation`'s
 * dynamic import, on the client).
 *
 * Import + call `registerLottieEngine()` at module level in a **client** module
 * where you mount raw Lottie JSON, so it mounts synchronously.
 */
export { registerLottieEngine } from "./lottie/mount.js";
