/**
 * Compressor mode — the Node half of the package.
 *
 * Turns an authored Remotion composition into a portable `.zip` the loader mode
 * plays at runtime. `react`/`react-dom`/`remotion` are marked **external**, so
 * the bundle keeps its `require(...)` calls and stays a couple of KB; the loader
 * satisfies them with the host app's copies. Image imports are redirected to the
 * shared asset module and packed into the zip.
 *
 * This module imports `esbuild` and Node built-ins and must never be pulled into
 * a browser bundle — it lives behind the `./compress` entry precisely so the
 * loader mode never reaches it.
 */
import { build } from "esbuild";
import { zipSync, strToU8 } from "fflate";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  ASSET_MODULE,
  BUNDLE_FORMAT,
  RUNTIME_EXTERNALS,
  type AnimationManifest,
} from "../core/manifest.js";

const ASSET_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

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
export async function compressAnimation(
  animDir: string,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const entry = path.join(animDir, "composition.tsx");
  const manifestPath = path.join(animDir, "manifest.json");
  const name = path.basename(animDir);
  if (!existsSync(entry)) throw new Error(`${name}: missing composition.tsx`);
  if (!existsSync(manifestPath)) {
    throw new Error(`${name}: missing manifest.json`);
  }

  const config = JSON.parse(readFileSync(manifestPath, "utf8")) as AnimationConfig;
  for (const key of ["width", "height", "fps", "durationInFrames"] as const) {
    if (typeof config[key] !== "number") {
      throw new Error(`${name}: manifest.json is missing numeric "${key}"`);
    }
  }

  const collected = new Map<string, string>();
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "browser",
    target: "es2019",
    minify: true,
    jsx: "automatic",
    legalComments: "none",
    external: [...RUNTIME_EXTERNALS],
    plugins: [assetPlugin(animDir, collected)],
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;

  const assets = [...collected.keys()].sort();
  const manifest: AnimationManifest = {
    format: BUNDLE_FORMAT,
    id: config.id ?? name,
    name: config.name,
    width: config.width,
    height: config.height,
    fps: config.fps,
    durationInFrames: config.durationInFrames,
    entry: "animation.js",
    assets,
    runtime: { remotion: options.remotionVersion ?? resolveRemotionVersion() },
  };

  // Sanity check: the bundle must evaluate to a component (catches interop /
  // syntax errors before the zip ever reaches a browser).
  smokeTest(code, manifest.id);

  const zipInput: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "animation.js": strToU8(code),
  };
  for (const [rel, abs] of collected) {
    zipInput[rel] = new Uint8Array(readFileSync(abs));
  }
  const bytes = zipSync(zipInput, { level: 9 });

  return {
    id: manifest.id,
    bytes,
    manifest,
    jsBytes: code.length,
    zipBytes: bytes.length,
    assetCount: assets.length,
  };
}

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
export async function buildAnimations(
  options: BuildAnimationsOptions,
): Promise<CompressResult[]> {
  const { srcDir, outDir, onBuilt, ...compressOptions } = options;
  if (!existsSync(srcDir)) {
    throw new Error(`animations source directory not found: ${srcDir}`);
  }
  const names = readdirSync(srcDir).filter((n) =>
    statSync(path.join(srcDir, n)).isDirectory(),
  );

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const results: CompressResult[] = [];
  for (const name of names) {
    const result = await compressAnimation(
      path.join(srcDir, name),
      compressOptions,
    );
    writeFileSync(path.join(outDir, `${result.id}.zip`), result.bytes);
    results.push(result);
    onBuilt?.(result);
  }
  return results;
}

/**
 * esbuild plugin: redirect image imports to the shared asset module (resolved
 * against blob URLs at load) and record each source file so it can be zipped.
 */
function assetPlugin(animDir: string, collected: Map<string, string>) {
  return {
    name: "lf-animation-assets",
    setup(b: import("esbuild").PluginBuild) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") return null;
        const ext = path.extname(args.path).toLowerCase();
        if (!ASSET_EXTS.has(ext)) return null;
        const abs = path.resolve(args.resolveDir, args.path);
        const rel = path.relative(animDir, abs).split(path.sep).join("/");
        collected.set(rel, abs);
        return { path: rel, namespace: "lf-asset" };
      });
      b.onLoad({ filter: /.*/, namespace: "lf-asset" }, (args) => ({
        contents:
          `import { asset } from ${JSON.stringify(ASSET_MODULE)};\n` +
          `export default asset(${JSON.stringify(args.path)});\n`,
        loader: "js" as const,
        resolveDir: animDir,
      }));
    },
  };
}

function smokeTest(code: string, id: string): void {
  const requireStub = (s: string) =>
    s === ASSET_MODULE ? { asset: () => "blob:stub" } : {};
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)(
    requireStub,
    mod,
    mod.exports,
  );
  if (typeof mod.exports.default !== "function") {
    throw new Error(`${id}: built bundle does not default-export a component`);
  }
}

function resolveRemotionVersion(): string {
  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    const pkg = require("remotion/package.json") as { version?: string };
    if (pkg.version) return pkg.version;
  } catch {
    // remotion not resolvable from cwd — fall through.
  }
  return "0.0.0";
}
