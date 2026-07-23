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
export declare function getRuntime(): AnimationRuntime;
