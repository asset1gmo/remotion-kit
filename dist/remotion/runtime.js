import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactJSXRuntime from "react/jsx-runtime";
import * as Remotion from "remotion";
// Stored on globalThis so there is exactly one runtime per page even if this
// package is bundled more than once (two React copies would break hooks).
const GLOBAL_KEY = "__LF_REMOTION_ANIMATION_RT__";
function createRuntime() {
    const require = (specifier) => {
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
                throw new Error(`[remotion-animation] bundle requested "${specifier}", which is not ` +
                    "provided at load time. Animations may only import react, remotion " +
                    "and their own asset runtime.");
        }
    };
    return { React, ReactDOM, ReactJSXRuntime, Remotion, require };
}
export function getRuntime() {
    const g = globalThis;
    let rt = g[GLOBAL_KEY];
    if (!rt) {
        rt = createRuntime();
        g[GLOBAL_KEY] = rt;
    }
    return rt;
}
