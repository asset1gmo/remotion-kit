import { getEngine } from "./core/registry.js";
import type { AnimationHandle } from "./core/handle.js";
import type {
  LoadAnimationConfig,
  PreparedAnimation,
  UnzipAnimationOptions,
} from "./core/config.js";

/**
 * Fetch + decode an animation **URL** into a ready-to-mount
 * {@link PreparedAnimation} (plain data). This is the **async** half — all the
 * network I/O, plus the dynamic `import()` that loads + registers the engine:
 *
 *   - `.zip`    Remotion code bundle -> fetched, unzipped, evaluated
 *   - `.json`   raw Lottie JSON      -> fetched, parsed        (TEMPORARY)
 *   - `.lottie` dotLottie            -> fetched, unzipped       (TEMPORARY)
 *
 * For Lottie JSON you already hold (a bundled import, an API payload), there is
 * nothing to fetch — build `{ kind: "lottie", data }` yourself and mount it. In
 * that case the Lottie engine won't have loaded via this function, so import and
 * call `registerLottieEngine()` (module level) where you do so.
 *
 * Both engines are code-split behind the dynamic imports here, so nothing pulls
 * a rendering engine into an app's static bundle through this module.
 */
export async function unzipAnimation(
  src: string,
  options: UnzipAnimationOptions = {},
): Promise<PreparedAnimation> {
  if (resolveFormat(src, options.format) === "remotion") {
    const { prepareRemotion } = await import("./remotion/mount.js");
    return prepareRemotion(src);
  }
  const { prepareLottie } = await import("./lottie/mount.js");
  return prepareLottie(src);
}

/**
 * Mount a {@link PreparedAnimation} into a container and return a controllable
 * {@link AnimationHandle} shaped exactly like a lottie-web `AnimationItem`.
 *
 * **Synchronous.** It looks the engine up by `kind` in the registry and calls
 * it, importing no engine itself. The engine must be registered first —
 * {@link unzipAnimation} does that for URL sources; `registerLottieEngine()`
 * does it for raw Lottie JSON.
 *
 * ```ts
 * const anim = loadAnimation({ container, animation: prepared, loop: true });
 * anim.setSpeed(2);
 * anim.destroy();
 * ```
 */
export function loadAnimation(config: LoadAnimationConfig): AnimationHandle {
  const { container, animation, ...mountConfig } = config;
  return getEngine(animation.kind)(container, animation, mountConfig);
}

function resolveFormat(
  src: string,
  format: UnzipAnimationOptions["format"] = "auto",
): "remotion" | "lottie" {
  if (format !== "auto") return format;
  return isZip(src) ? "remotion" : "lottie";
}

function isZip(src: string): boolean {
  return src.split(/[?#]/)[0].toLowerCase().endsWith(".zip");
}
