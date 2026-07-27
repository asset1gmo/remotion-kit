import type { ComponentType } from "react";
import type {
  AnimationDirection,
  AnimationHandle,
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
 * A decoded, ready-to-mount animation produced by {@link unzipAnimation}. The
 * expensive, async work (fetch + unzip/decode/eval) is already done; `mount`
 * renders it synchronously.
 *
 * The `mount` closure captures the lazily-imported backend, which is why
 * `loadAnimation` can be synchronous *and* backend-free — an app that only ever
 * prepares Lottie never pulls the Remotion runtime into its bundle, and vice
 * versa. Prefer calling {@link loadAnimation} over `mount` directly.
 */
export type PreparedLottieAnimation = {
  readonly kind: "lottie";
  /** Decoded (and, if provided, transformed) Lottie JSON. */
  readonly data: Record<string, unknown>;
  mount(container: HTMLElement, config?: MountConfig): AnimationHandle;
};

export type PreparedRemotionAnimation = {
  readonly kind: "remotion";
  /** The evaluated composition component. */
  readonly component: ComponentType<Record<string, never>>;
  /** The bundle manifest (size, fps, duration, runtime, …). */
  readonly manifest: AnimationManifest;
  mount(container: HTMLElement, config?: MountConfig): AnimationHandle;
};

export type PreparedAnimation =
  | PreparedLottieAnimation
  | PreparedRemotionAnimation;

/** Options for {@link unzipAnimation} — the async decode step. */
export type UnzipAnimationOptions = {
  /** Override extension-based routing. Default `"auto"`. */
  format?: AnimationFormat;
  /**
   * LOTTIE (TEMPORARY) hook applied to the decoded Lottie JSON before it is
   * stored on the prepared animation. Must return a new object — do not mutate
   * the input (the decoded JSON is cached by URL). Ignored for Remotion `.zip`.
   */
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;
};

/** Config for {@link loadAnimation} — the synchronous mount step. */
export type LoadAnimationConfig = MountConfig & {
  /** DOM element to render into. Its contents are replaced. */
  container: HTMLElement;
  /** The prepared animation returned by {@link unzipAnimation}. */
  animation: PreparedAnimation;
};
