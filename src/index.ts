/**
 * Loader / player mode — the browser entry (`@asset1gmo/remotion-kit`).
 *
 * Two-step API:
 *   1. `unzipAnimation(url, opts?)` — async; fetches + unzips/decodes a URL into
 *      a `PreparedAnimation` (plain data). For Lottie JSON you already hold, just
 *      build `{ kind: "lottie", data }` yourself.
 *   2. `loadAnimation({ container, animation, ... })` — synchronous; looks the
 *      engine up by `kind` and mounts, returning a controllable `AnimationHandle`.
 *      Transform Lottie JSON by editing `prepared.data` before this call.
 *
 * Neither engine is in the static bundle by default — `unzipAnimation` loads
 * them lazily. To mount raw Lottie JSON synchronously, import + call
 * `registerLottieEngine()` at module level where you do it: that pulls lottie-web
 * into *that* bundle and registers the engine. The compressor mode lives at the
 * separate `./compress` entry and never reaches this graph.
 */
export { unzipAnimation, loadAnimation } from "./load-animation.js";

// LOTTIE (TEMPORARY): opt-in static registration of the Lottie engine. Import +
// call at module level to mount raw Lottie JSON synchronously; this is what pulls
// lottie-web into that module's bundle (tree-shaken out where unused).
export { registerLottieEngine } from "./lottie/mount.js";

export type {
  AnimationHandle,
  // lottie-web-parity types, vendored so they outlive Lottie support:
  AnimationDirection,
  AnimationSegment,
  RendererType,
  AnimationEventName,
  AnimationEventCallback,
  AnimationEvents,
  BMCompleteEvent,
  BMCompleteLoopEvent,
  BMDestroyEvent,
  BMEnterFrameEvent,
  BMSegmentStartEvent,
} from "./core/handle.js";

export type {
  AnimationFormat,
  MountConfig,
  LoadAnimationConfig,
  UnzipAnimationOptions,
  PreparedAnimation,
  PreparedLottieAnimation,
  PreparedRemotionAnimation,
} from "./core/config.js";

export type { AnimationManifest, AnimationMeta } from "./core/manifest.js";
