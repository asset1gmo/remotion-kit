import type { AnimationHandle, LoadAnimationConfig } from "./core/handle.js";
/**
 * The one imperative loader. Renders any supported animation into a container
 * and returns a controllable {@link AnimationHandle} shaped exactly like a
 * lottie-web `AnimationItem`:
 *
 *   - `.zip`    Remotion code bundle -> Remotion `<Player>` in the container
 *   - `.json`   raw Lottie JSON      -> lottie-web        (TEMPORARY)
 *   - `.lottie` dotLottie            -> lottie-web        (TEMPORARY)
 *
 * ```ts
 * const anim = await loadAnimation({ container, src: "/promo.zip", loop: true });
 * anim.setSpeed(2);
 * anim.goToAndStop(30, true);
 * const off = anim.addEventListener("complete", () => {});
 * anim.destroy();
 * ```
 *
 * Both backends are code-split behind a dynamic import, so an app only ships the
 * one it actually loads. Routing is by extension unless `config.format` overrides
 * it — set `format` for URLs without a usable extension (signed/blob/API URLs).
 */
export declare function loadAnimation(config: LoadAnimationConfig): Promise<AnimationHandle>;
