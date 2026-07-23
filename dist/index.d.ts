/**
 * Loader / player mode — the browser entry (`@asset1gmo/remotion-kit`).
 *
 * The whole public surface is `loadAnimation` and its types. Both animation
 * backends are lazy-loaded inside `loadAnimation`, so nothing here pulls a
 * backend into the importing app's bundle until an animation of that kind is
 * actually loaded. The compressor mode lives at the separate `./compress` entry
 * and never reaches this graph.
 */
export { loadAnimation } from "./load-animation.js";
export type { AnimationHandle, LoadAnimationConfig, AnimationFormat, AnimationDirection, AnimationSegment, RendererType, AnimationEventName, AnimationEventCallback, AnimationEvents, BMCompleteEvent, BMCompleteLoopEvent, BMDestroyEvent, BMEnterFrameEvent, BMSegmentStartEvent, } from "./core/handle.js";
