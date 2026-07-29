import type { AnimationHandle } from "./handle.js";
import type { MountConfig, PreparedAnimation } from "./config.js";

/**
 * Engine registry — how a synchronous, backend-free `loadAnimation` reaches the
 * right rendering engine without importing it.
 *
 * Each backend registers a mount function here, and `loadAnimation` does a
 * synchronous `getEngine(kind)` lookup — so `loadAnimation` stays engine-free.
 *
 * Registration is via a function call, not a load-time side effect (so the
 * backend modules stay tree-shakeable and package.json can keep
 * `"sideEffects": false`):
 *   - Remotion — `prepareRemotion` registers it; reached only via the dynamic
 *     `import()` in `unzipAnimation`, so `@remotion/player` stays out of
 *     Lottie-only bundles.
 *   - Lottie — `prepareLottie` registers it for URL sources; for raw JSON, the
 *     consumer imports + calls `registerLottieEngine()` at module level, which is
 *     what pulls lottie-web into *that* bundle and lets JSON mount synchronously.
 */
export type EngineKind = PreparedAnimation["kind"];

/** A backend's synchronous mount function. */
export type EngineMount = (
  container: HTMLElement,
  animation: PreparedAnimation,
  config: MountConfig,
) => AnimationHandle;

const engines = new Map<EngineKind, EngineMount>();

/** Called by a backend module at load time to register its mount function. */
export function registerEngine(kind: EngineKind, mount: EngineMount): void {
  engines.set(kind, mount);
}

/** Look up a registered engine, or throw with an actionable message. */
export function getEngine(kind: EngineKind): EngineMount {
  const mount = engines.get(kind);
  if (!mount) {
    throw new Error(
      `[remotion-animation] the "${kind}" engine is not loaded yet — prepare the ` +
        `animation with unzipAnimation(...) before calling loadAnimation.`,
    );
  }
  return mount;
}
