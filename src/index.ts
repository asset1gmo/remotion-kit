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
 * them lazily, so this entry is SSR-safe (it never evaluates lottie-web, which
 * touches `document` at import). To mount raw Lottie JSON synchronously, import
 * `registerLottieEngine` from the separate `@asset1gmo/remotion-kit/lottie` entry
 * and call it at module level in a client module. The compressor mode lives at
 * the separate `./compress` entry and never reaches this graph.
 */
export { unzipAnimation, loadAnimation } from "./load-animation.js";

/**
 * Resolve an animation's declared fonts. `unzipAnimation` already calls this, so
 * the zip path needs nothing — it is exported for callers that render a
 * composition themselves (a dev-mode player importing the source directly) and
 * need the same guarantee before first layout.
 */
export { ensureFonts } from "./core/fonts.js";

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

export type {
  AnimationManifest,
  AnimationMeta,
  AnimationFont,
} from "./core/manifest.js";
