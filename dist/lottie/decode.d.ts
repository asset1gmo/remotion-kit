export type LottieData = Record<string, unknown>;
/** Fetch + decode a Lottie `.json` / dotLottie `.lottie` URL, memoized by `src`. */
export declare function loadLottie(src: string): Promise<LottieData>;
/**
 * Decode raw bytes — either Lottie JSON or a dotLottie ZIP — into the Lottie
 * JSON object. Exposed for callers that already have the bytes (e.g. a file
 * upload) and want to skip the fetch.
 */
export declare function decodeLottieBytes(bytes: Uint8Array, label?: string): LottieData;
