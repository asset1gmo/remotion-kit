import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactJSXRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";

/**
 * Host runtime handed to evaluated animation bundles.
 *
 * Bundles are built with `react`/`react-dom`/`remotion` marked **external** —
 * the zip keeps `require("remotion")` calls instead of inlining the libraries.
 * At load time we satisfy those requires with the host app's *already-loaded*
 * copies, so the animation shares the exact same React instance (hooks work) and
 * the exact same Remotion instance (frame context lines up). This is why every
 * zip stays a couple of KB.
 */

export type RequireFn = (specifier: string) => unknown;

export type AnimationRuntime = {
  React: typeof React;
  ReactDOM: typeof ReactDOM;
  ReactJSXRuntime: typeof ReactJSXRuntime;
  Remotion: typeof Remotion;
  /** Resolver for the libraries a bundle is allowed to import. */
  require: RequireFn;
};

// Stored on globalThis so there is exactly one runtime per page even if this
// package is bundled more than once (two React copies would break hooks).
const GLOBAL_KEY = "__LF_REMOTION_ANIMATION_RT__";

function createRuntime(): AnimationRuntime {
  const require: RequireFn = (specifier) => {
    switch (specifier) {
      case "react":
        return React;
      case "react-dom":
        return ReactDOM;
      case "react/jsx-runtime":
        return ReactJSXRuntime;
      case "remotion":
        return Remotion;
      default:
        throw new Error(
          `[remotion-animation] bundle requested "${specifier}", which is not ` +
            "provided at load time. Animations may only import react, remotion " +
            "and their own asset runtime.",
        );
    }
  };

  return { React, ReactDOM, ReactJSXRuntime, Remotion, require };
}

export function getRuntime(): AnimationRuntime {
  const g = globalThis as Record<string, unknown>;
  let rt = g[GLOBAL_KEY] as AnimationRuntime | undefined;
  if (!rt) {
    rt = createRuntime();
    g[GLOBAL_KEY] = rt;
  }
  return rt;
}
