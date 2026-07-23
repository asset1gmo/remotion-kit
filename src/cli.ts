#!/usr/bin/env node
/**
 * CLI for compressor mode:
 *
 *   remotion-animation-build [srcDir] [outDir]
 *
 * Defaults: srcDir = ./animations, outDir = ./public/animations-zips. Each
 * immediate subdirectory of srcDir is compressed to `<id>.zip` in outDir.
 */
import path from "node:path";
import { buildAnimations } from "./compressor/compress.js";

async function main(): Promise<void> {
  const [srcArg, outArg] = process.argv.slice(2);
  const srcDir = path.resolve(process.cwd(), srcArg ?? "animations");
  const outDir = path.resolve(
    process.cwd(),
    outArg ?? path.join("public", "animations-zips"),
  );

  const kb = (n: number) => `${(n / 1024).toFixed(1)}KB`;
  console.log(`Building animations\n  from ${srcDir}\n  to   ${outDir}\n`);

  const results = await buildAnimations({
    srcDir,
    outDir,
    onBuilt: (r) =>
      console.log(
        `  ✓ ${r.id.padEnd(24)} js ${kb(r.jsBytes).padStart(8)}   ` +
          `zip ${kb(r.zipBytes).padStart(8)}   assets ${r.assetCount}`,
      ),
  });

  if (results.length === 0) console.log("  (no animation folders found)");
  console.log(`\nDone — ${results.length} animation(s).`);
}

main().catch((err: unknown) => {
  console.error("\nAnimation build failed:\n", err);
  process.exit(1);
});
