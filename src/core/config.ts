import type { ComponentType } from "react";
import type {
  AnimationDirection,
  AnimationSegment,
  RendererType,
} from "./handle.js";
import type { AnimationManifest } from "./manifest.js";

/**
 * Which backend to use. `"auto"` (the default) routes on the `src` extension:
 * `.zip` -> Remotion, everything else -> Lottie. Set it explicitly for URLs
 * without a usable extension (signed CDN links, blob URLs, API endpoints).
 */
export type AnimationFormat = "auto" | "remotion" | "lottie";

/**
 * Playback options applied when a prepared animation is mounted. This is the
 * synchronous half — no `src`, no `transform`, nothing that needs I/O (that all
 * happens in {@link unzipAnimation}).
 */
export type MountConfig = {
  /** Default `true`. A number means "loop N times" (Lottie only). */
  loop?: boolean | number;
  /** Default `true`. */
  autoplay?: boolean;
  /** Default `1`. */
  speed?: number;
  /** Default `1`. */
  direction?: AnimationDirection;
  /** Restrict playback to `[start, end]` from the first frame. */
  initialSegment?: AnimationSegment;
  /** Name reported by `handle.name`. Defaults to the manifest id / filename. */
  name?: string;

  // ───────────────────────────────────────────────────────────────────────────
  // LOTTIE (TEMPORARY) — ignored by the Remotion backend.
  // ───────────────────────────────────────────────────────────────────────────
  /** lottie-web renderer. Default `"svg"`. */
  renderer?: RendererType;
  /** Base path lottie-web resolves external assets against. */
  assetsPath?: string;
};

/**
 * A decoded, ready-to-mount animation — plain data. The expensive async work
 * (fetch + unzip/decode/eval) is already done; the matching engine (looked up by
 * `kind` in the registry) renders it when you call {@link loadAnimation}.
 */
export type PreparedLottieAnimation = {
  readonly kind: "lottie";
  /**
   * Decoded Lottie JSON. **Mutable on purpose** — transform it in place
   * (recolor, retime, …) before {@link loadAnimation}; the engine reads it at
   * mount. Assign a *new* object rather than mutating the existing one: the
   * decoded JSON is cached by URL, so in-place mutation would corrupt the cache.
   */
  data: Record<string, unknown>;
};

export type PreparedRemotionAnimation = {
  readonly kind: "remotion";
  /** The evaluated composition component. */
  readonly component: ComponentType<Record<string, never>>;
  /** The bundle manifest (size, fps, duration, runtime, …). */
  readonly manifest: AnimationManifest;
};

export type PreparedAnimation =
  | PreparedLottieAnimation
  | PreparedRemotionAnimation;

/** Options for {@link unzipAnimation} — the async decode step. */
export type UnzipAnimationOptions = {
  /** Override extension-based routing. Default `"auto"`. */
  format?: AnimationFormat;
};

/** Config for {@link loadAnimation} — the synchronous mount step. */
export type LoadAnimationConfig = MountConfig & {
  /** DOM element to render into. Its contents are replaced. */
  container: HTMLElement;
  /** The prepared animation returned by {@link unzipAnimation}. */
  animation: PreparedAnimation;
};
