/**
 * Loader / player mode — the browser entry (`@asset1gmo/remotion-kit`).
 *
 * Two-step API:
 *   1. `unzipAnimation(src, opts?)` — async; fetches + unzips/decodes the source
 *      into a `PreparedAnimation` (this is where the Lottie `transform` runs).
 *   2. `loadAnimation({ container, animation, ... })` — synchronous; mounts the
 *      prepared animation and returns a controllable `AnimationHandle`.
 *
 * Both backends are lazy-loaded inside `unzipAnimation`, so nothing here pulls a
 * backend into the importing app's bundle until an animation of that kind is
 * actually prepared. The compressor mode lives at the separate `./compress`
 * entry and never reaches this graph.
 */
export { unzipAnimation, loadAnimation } from "./load-animation.js";

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
