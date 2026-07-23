import { type AnimationManifest } from "../core/manifest.js";
/** The authored subset of the manifest — what a human writes in `manifest.json`. */
export type AnimationConfig = {
    id?: string;
    name?: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
};
export type CompressOptions = {
    /**
     * Version string written to `manifest.runtime.remotion`. Defaults to the
     * `remotion` version resolved from the current working directory.
     */
    remotionVersion?: string;
};
export type CompressResult = {
    id: string;
    /** The finished zip. */
    bytes: Uint8Array;
    manifest: AnimationManifest;
    /** Minified bundle size in bytes (pre-zip). */
    jsBytes: number;
    /** Final zip size in bytes. */
    zipBytes: number;
    assetCount: number;
};
/**
 * Compress a single animation folder — `composition.tsx` + `manifest.json`
 * (+ optional `images/`) — into a zip. Does not touch disk; returns the bytes.
 */
export declare function compressAnimation(animDir: string, options?: CompressOptions): Promise<CompressResult>;
export type BuildAnimationsOptions = CompressOptions & {
    /** Directory of animation folders (each with composition.tsx + manifest.json). */
    srcDir: string;
    /** Directory to write `<id>.zip` files into. Created if absent. */
    outDir: string;
    /** Called after each animation is written, for progress reporting. */
    onBuilt?: (result: CompressResult) => void;
};
/**
 * Compress every immediate subdirectory of `srcDir` and write `<id>.zip` into
 * `outDir`. Returns one result per animation.
 */
export declare function buildAnimations(options: BuildAnimationsOptions): Promise<CompressResult[]>;
