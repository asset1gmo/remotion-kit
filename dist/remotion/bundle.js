import { unzipSync } from "fflate";
import { ASSET_MODULE } from "../core/manifest.js";
import { getRuntime } from "./runtime.js";
const MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
};
// Bundles are small and few — cache by URL forever and never re-fetch or
// re-evaluate. Blob URLs minted for assets are intentionally not revoked so a
// cached animation can be remounted at any time.
const cache = new Map();
/** Fetch, unzip and evaluate a Remotion `.zip`, memoized by `src`. */
export function loadBundle(src) {
    let pending = cache.get(src);
    if (!pending) {
        pending = evaluate(src).catch((err) => {
            cache.delete(src); // don't cache failures — allow a retry on next mount
            throw err;
        });
        cache.set(src, pending);
    }
    return pending;
}
async function evaluate(src) {
    const res = await fetch(src);
    if (!res.ok) {
        throw new Error(`[remotion-animation] failed to fetch ${src}: ${res.status} ${res.statusText}`);
    }
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
    const manifestBytes = files["manifest.json"];
    if (!manifestBytes) {
        throw new Error(`[remotion-animation] ${src} is missing manifest.json`);
    }
    const manifest = JSON.parse(decode(manifestBytes));
    // Resolve every asset to a blob URL up front so `asset(id)` is synchronous
    // during bundle evaluation.
    const assetMap = new Map();
    for (const id of manifest.assets ?? []) {
        const data = files[id];
        if (!data) {
            throw new Error(`[remotion-animation] ${src}: manifest lists asset "${id}" but it is not in the bundle`);
        }
        const ext = id.split(".").pop()?.toLowerCase() ?? "";
        const blob = new Blob([data], {
            type: MIME[ext] ?? "application/octet-stream",
        });
        assetMap.set(id, URL.createObjectURL(blob));
    }
    const entryBytes = files[manifest.entry];
    if (!entryBytes) {
        throw new Error(`[remotion-animation] ${src} is missing entry "${manifest.entry}"`);
    }
    const rt = getRuntime();
    const require = (specifier) => {
        if (specifier === ASSET_MODULE) {
            return {
                asset(id) {
                    const url = assetMap.get(id);
                    if (!url) {
                        throw new Error(`[remotion-animation] ${src}: asset "${id}" was not bundled`);
                    }
                    return url;
                },
            };
        }
        return rt.require(specifier);
    };
    // The bundle is CJS with externals satisfied by `require`. The target apps are
    // private with no strict CSP, so `new Function` evaluation is fine and keeps
    // React/Remotion as singletons (no import maps needed).
    const moduleObj = { exports: {} };
    const factory = new Function("require", "module", "exports", decode(entryBytes));
    factory(require, moduleObj, moduleObj.exports);
    const component = moduleObj.exports.default;
    if (typeof component !== "function") {
        throw new Error(`[remotion-animation] ${src}: entry did not default-export a component`);
    }
    return {
        component: component,
        manifest,
        assetUrls: [...assetMap.values()],
    };
}
function decode(bytes) {
    return new TextDecoder().decode(bytes);
}
