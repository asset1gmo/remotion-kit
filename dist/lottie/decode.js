/**
 * LOTTIE (TEMPORARY) — everything under `src/lottie/` exists only until prod
 * animations finish migrating from Lottie to Remotion. Deleting this folder,
 * the `.json`/`.lottie` branch in `load-animation.ts`, and the `lottie-web`
 * dependency removes Lottie support cleanly.
 *
 * Fetch + decode a Lottie source into the plain Lottie JSON object lottie-web's
 * `loadAnimation({ animationData })` expects.
 *
 * Accepts either a raw `.json` Lottie or a dotLottie `.lottie` (a ZIP wrapping
 * the same JSON + optional images). dotLottie v1 (`animations/`, `images/`) and
 * v2 (`a/`, `i/`) layouts are both supported; packed images are rewritten to
 * blob URLs so lottie-web renders them without a separate `assetsPath`.
 */
import { unzipSync } from "fflate";
const MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
};
const cache = new Map();
/** Fetch + decode a Lottie `.json` / dotLottie `.lottie` URL, memoized by `src`. */
export function loadLottie(src) {
    let pending = cache.get(src);
    if (!pending) {
        pending = fetchAndDecode(src).catch((err) => {
            cache.delete(src); // don't cache failures — allow a retry on next mount
            throw err;
        });
        cache.set(src, pending);
    }
    return pending;
}
async function fetchAndDecode(src) {
    const res = await fetch(src);
    if (!res.ok) {
        throw new Error(`[remotion-animation] failed to fetch ${src}: ${res.status} ${res.statusText}`);
    }
    return decodeLottieBytes(new Uint8Array(await res.arrayBuffer()), src);
}
/**
 * Decode raw bytes — either Lottie JSON or a dotLottie ZIP — into the Lottie
 * JSON object. Exposed for callers that already have the bytes (e.g. a file
 * upload) and want to skip the fetch.
 */
export function decodeLottieBytes(bytes, label = "lottie") {
    // dotLottie is a ZIP — detect by the local-file-header magic "PK\x03\x04".
    const isZip = bytes.length > 3 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;
    if (isZip)
        return decodeDotLottie(bytes, label);
    return JSON.parse(decode(bytes));
}
function decodeDotLottie(bytes, label) {
    const files = unzipSync(bytes);
    const animPath = findAnimationPath(files, label);
    const lottie = JSON.parse(decode(files[animPath]));
    inlineDotLottieImages(lottie, files);
    return lottie;
}
function findAnimationPath(files, label) {
    const manifestRaw = files["manifest.json"];
    let manifest;
    if (manifestRaw) {
        try {
            manifest = JSON.parse(decode(manifestRaw));
        }
        catch {
            // Malformed manifest — fall through to a structural scan.
        }
    }
    // A Remotion animation bundle is *also* a zip, but it carries a JS bundle, not
    // Lottie vector data. Detect it and fail with an actionable message.
    if (manifest && typeof manifest.entry === "string" && files[manifest.entry]) {
        throw new Error(`[remotion-animation] ${label}: this is a Remotion animation bundle ` +
            `("${manifest.entry}" inside), not a Lottie/dotLottie file. Load it ` +
            `with a .zip src (or format: "remotion") instead.`);
    }
    // Prefer the manifest's first animation id: v1 -> animations/<id>.json,
    // v2 -> a/<id>.json.
    const id = manifest?.animations?.[0]?.id;
    if (id) {
        for (const candidate of [`animations/${id}.json`, `a/${id}.json`]) {
            if (files[candidate])
                return candidate;
        }
    }
    // Fallback: first JSON directly under animations/ (v1) or a/ (v2).
    const found = Object.keys(files).find((k) => /^(animations|a)\/[^/]+\.json$/i.test(k));
    if (!found) {
        throw new Error(`[remotion-animation] ${label}: no Lottie animation found inside the archive`);
    }
    return found;
}
/**
 * dotLottie keeps referenced images in `images/` (v1) or `i/` (v2) rather than
 * inline. Rewrite each external image asset to a blob URL of the packed bytes.
 * Self-contained animations (images already embedded as base64 data URIs) are
 * left untouched.
 */
function inlineDotLottieImages(lottie, files) {
    const assets = lottie.assets;
    if (!Array.isArray(assets))
        return;
    for (const asset of assets) {
        const p = asset.p;
        if (typeof p !== "string" || p.startsWith("data:"))
            continue; // already embedded
        const u = typeof asset.u === "string" ? asset.u : "";
        const candidate = [u + p, `images/${p}`, `i/${p}`, p].find((c) => files[c]);
        if (!candidate)
            continue;
        const ext = candidate.split(".").pop()?.toLowerCase() ?? "";
        const blob = new Blob([files[candidate]], {
            type: MIME[ext] ?? "application/octet-stream",
        });
        asset.p = URL.createObjectURL(blob);
        asset.u = "";
        asset.e = 1; // tell lottie-web `p` is a ready-to-use URL, not a path to fetch
    }
}
function decode(bytes) {
    return new TextDecoder().decode(bytes);
}
