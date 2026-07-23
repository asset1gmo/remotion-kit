/**
 * The bundle contract shared by the two modes.
 *
 * The compressor (`src/compressor/`, Node) writes `manifest.json` into each zip;
 * the loader (`src/remotion/`, browser) reads it back. Keeping the shape and the
 * asset-module constant here — imported by both — is what stops them drifting
 * apart. Neither this file nor anything it imports pulls in a backend, so it is
 * safe to include from either mode without bloating the other's bundle.
 */
/** Current bundle layout. Bump when the zip format changes incompatibly. */
export const BUNDLE_FORMAT = 1;
/**
 * Virtual module the compressor rewrites image imports to, and the loader
 * intercepts at evaluation time to hand back a blob URL:
 *
 *   `import url from "./images/x.png"`
 *      -> `import { asset } from "<ASSET_MODULE>"; export default asset("images/x.png")`
 *
 * It is marked external in the build and never resolved by a real bundler, so it
 * only has to be a stable, collision-proof string.
 */
export const ASSET_MODULE = "@asset1gmo/remotion-kit/asset";
/** External specifiers an animation bundle is allowed to `require` at load. */
export const RUNTIME_EXTERNALS = [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "remotion",
    ASSET_MODULE,
];
