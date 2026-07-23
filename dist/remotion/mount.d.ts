import type { AnimationHandle, LoadAnimationConfig } from "../core/handle.js";
/**
 * Mount a Remotion `.zip` into a container and adapt its `<Player>` to the
 * shared {@link AnimationHandle}, so a Remotion animation is driven with the
 * exact lottie-web API.
 *
 * Reached only via the lazy import in `load-animation.ts`, so the Remotion
 * runtime is code-split out of Lottie-only consumers.
 */
export declare function mountRemotion(config: LoadAnimationConfig): Promise<AnimationHandle>;
