import { type AnimationManifest } from "../core/manifest.js";
import type { ComponentType } from "react";
/** Component evaluated out of a zip, plus the metadata the Player needs. */
export type LoadedBundle = {
    component: ComponentType<Record<string, never>>;
    manifest: AnimationManifest;
    /** Object URLs minted for the bundle's assets (kept alive while cached). */
    assetUrls: string[];
};
/** Fetch, unzip and evaluate a Remotion `.zip`, memoized by `src`. */
export declare function loadBundle(src: string): Promise<LoadedBundle>;
