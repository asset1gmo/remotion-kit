import type { AnimationHandle } from "./core/handle.js";
import type {
  LoadAnimationConfig,
  PreparedAnimation,
  UnzipAnimationOptions,
} from "./core/config.js";

/**
 * Decode an animation source into a ready-to-mount {@link PreparedAnimation}.
 * This is the **async** half — it does all the I/O:
 *
 *   - `.zip`    Remotion code bundle -> fetched, unzipped, evaluated
 *   - `.json`   raw Lottie JSON      -> fetched, parsed        (TEMPORARY)
 *   - `.lottie` dotLottie            -> fetched, unzipped       (TEMPORARY)
 *
 * The backend is code-split behind a dynamic import, so an app only ships the
 * one it actually prepares. Routing is by extension unless `options.format`
 * overrides it. The Lottie-only `transform` hook is applied here.
 *
 * ```ts
 * const prepared = await unzipAnimation("/promo.zip");
 * const anim = loadAnimation({ container, animation: prepared, loop: true });
 * ```
 */
export async function unzipAnimation(
  src: string | Record<string, unknown>,
  options: UnzipAnimationOptions = {},
): Promise<PreparedAnimation> {
  if (resolveFormat(src, options.format) === "remotion") {
    if (typeof src !== "string") {
      throw new Error(
        "[remotion-animation] a Remotion (.zip) animation needs a URL `src`, not a parsed object.",
      );
    }
    const { prepareRemotion } = await import("./remotion/mount.js");
    return prepareRemotion(src);
  }
  // LOTTIE (TEMPORARY): when Lottie support is dropped, delete this branch and
  // the `src/lottie/` folder; `.zip` (Remotion) becomes the only path.
  const { prepareLottie } = await import("./lottie/mount.js");
  return prepareLottie(src, options.transform);
}

/**
 * Mount a {@link PreparedAnimation} into a container and return a controllable
 * {@link AnimationHandle} shaped exactly like a lottie-web `AnimationItem`.
 *
 * This is the **synchronous** half — all the async work already happened in
 * {@link unzipAnimation}. It stays backend-free (it just invokes the prepared
 * animation's own `mount`), so importing it never pulls in a backend.
 *
 * ```ts
 * const anim = loadAnimation({ container, animation: prepared, loop: true });
 * anim.setSpeed(2);
 * anim.goToAndStop(30, true);
 * anim.destroy();
 * ```
 */
export function loadAnimation(config: LoadAnimationConfig): AnimationHandle {
  const { container, animation, ...mountConfig } = config;
  return animation.mount(container, mountConfig);
}

function resolveFormat(
  src: string | Record<string, unknown>,
  format: UnzipAnimationOptions["format"] = "auto",
): "remotion" | "lottie" {
  if (format !== "auto") return format;
  // A parsed object is always Lottie JSON; only a URL can be a Remotion zip.
  if (typeof src === "string" && isZip(src)) return "remotion";
  return "lottie";
}

function isZip(src: string): boolean {
  return src.split(/[?#]/)[0].toLowerCase().endsWith(".zip");
}
