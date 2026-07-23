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
export async function loadAnimation(
  config: LoadAnimationConfig,
): Promise<AnimationHandle> {
  if (resolveFormat(config) === "remotion") {
    const { mountRemotion } = await import("./remotion/mount.js");
    return mountRemotion(config);
  }
  // LOTTIE (TEMPORARY): when Lottie support is dropped, delete this branch and
  // the `src/lottie/` folder; `.zip` (Remotion) becomes the only path.
  const { mountLottie } = await import("./lottie/mount.js");
  return mountLottie(config);
}

function resolveFormat(config: LoadAnimationConfig): "remotion" | "lottie" {
  const { format = "auto", src } = config;
  if (format !== "auto") return format;
  // A parsed object is always Lottie JSON; only a URL can be a Remotion zip.
  if (typeof src === "string" && isZip(src)) return "remotion";
  return "lottie";
}

function isZip(src: string): boolean {
  return src.split(/[?#]/)[0].toLowerCase().endsWith(".zip");
}
