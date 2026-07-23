# @asset1gmo/remotion-kit

Ship [Remotion](https://www.remotion.dev/) compositions as portable, self-contained
animation **zips** and play them at runtime — the same idea as dotLottie, but the
payload is a tiny code bundle instead of vector data.

The package has **two modes**, each behind its own entry point so an app only ever
bundles the one it uses:

| Mode | Entry | Runs in | Purpose |
| --- | --- | --- | --- |
| **Loader** | `@asset1gmo/remotion-kit` | Browser | `loadAnimation(...)` — render + control an animation in the DOM |
| **Compressor** | `@asset1gmo/remotion-kit/compress` | Node | build a composition into a portable `.zip` |

Importing one never pulls the other into your bundle — the compressor's `esbuild`
never reaches the browser, and the loader's Remotion/lottie runtime never reaches
your build tooling. (`sideEffects: false` + separate entries.)

A zip contains:

```
my-animation.zip
├── manifest.json     # id, width/height, fps, durationInFrames, assets, runtime
├── animation.js      # CJS bundle; react + remotion are external (not inlined)
└── images/           # optional raster assets, resolved to blob URLs at load
```

`react`, `react-dom` and `remotion` are **not** inside the bundle. The loader
supplies the host app's already-loaded copies when the bundle runs, so every
animation shares one React instance (hooks work) and one Remotion instance (frame
context lines up) — and each zip stays only a couple of KB.

## Install

```bash
npm install @asset1gmo/remotion-kit
```

`react` / `react-dom` are **peers** (the loader must use the host's single copy —
a second React breaks hooks). Everything else installs for you.

---

## Loader mode

`loadAnimation` renders into a container and returns an **`AnimationHandle`** — a
controllable instance shaped **exactly like a lottie-web `AnimationItem`**: same
methods (`play`/`pause`/`setSpeed`/`goToAndStop`/…), same live properties
(`currentFrame`, `totalFrames`, `isPaused`, `playDirection`, …), and the same
events (`enterFrame`, `complete`, `loopComplete`, `DOMLoaded`, …). Driving a
Remotion `.zip` is therefore identical to driving a Lottie file.

```ts
import { loadAnimation } from "@asset1gmo/remotion-kit";
import type { AnimationHandle } from "@asset1gmo/remotion-kit";

const anim: AnimationHandle = await loadAnimation({
  container: el,
  src: "/animations/promo.zip", // .zip (Remotion) | .json / .lottie (Lottie)
  loop: true,
  autoplay: true,
  speed: 1,
});

anim.setSpeed(2);
anim.goToAndStop(30, true);       // 30, interpreted as a frame
anim.setDirection(-1);            // reverse playback
anim.currentFrame;                // live read
const off = anim.addEventListener("complete", () => {});
off();                            // addEventListener returns its unsubscribe
anim.destroy();                   // tears down the backend + empties the container
```

### Routing by format

`src` is routed by extension; override with `format` for URLs that don't carry one
(signed CDN links, blob URLs, API endpoints):

| `src` | Format | Backend |
| --- | --- | --- |
| `*.zip` | Remotion code bundle | Remotion `<Player>` in the container |
| `*.json` | raw Lottie JSON | lottie-web |
| `*.lottie` | dotLottie (zip of Lottie JSON, v1 + v2, images inlined) | lottie-web |
| a parsed object | Lottie JSON | lottie-web |

```ts
await loadAnimation({ container, src: signedUrl, format: "remotion" });
```

Each backend is **code-split behind a dynamic import**, so an app that only ever
loads `.zip` never ships lottie-web, and an app that only ever loads Lottie never
ships the Remotion runtime (it downloads on demand when the first `.zip` loads).

### Remotion vs lottie-web parity notes

The handle is faithful, with a few mechanism differences on the Remotion backend:

- **Reverse** (`setDirection(-1)`) is driven by a `requestAnimationFrame` loop that
  seeks backwards, since Remotion's Player has no native reverse.
- **Segments** (`setSegment`/`playSegments`/`resetSegments`) map onto the Player's
  `inFrame`/`outFrame`.
- **`setSpeed`** re-renders the Player.
- **Marker names** (string args to `goToAndStop`/`goToAndPlay`) and a **numeric
  `loop` count** are lottie-only; `renderer`/`assetsPath`/`transform` config is
  ignored for `.zip`.

> **Lottie support is temporary.** It exists only until prod animations finish
> migrating to Remotion. When that's done, deleting `src/lottie/`, the `.json`/
> `.lottie` branch in `src/load-animation.ts`, and the `lottie-web` dependency
> removes it cleanly — the handle contract is Remotion-only after that.

---

## Compressor mode

Build authored compositions into zips from Node — in a build script, or via the CLI.

Each animation folder has:

```
my-animation/
├── composition.tsx   # default-exported Remotion composition
├── manifest.json     # { id?, name?, width, height, fps, durationInFrames }
└── images/           # optional assets, imported as `import x from "./images/x.png"`
```

A composition may only import from `react`, `remotion`, and its own assets — those
are external in the bundle; anything else won't be present at load. Use inline styles.

### CLI

```bash
# remotion-animation-build [srcDir] [outDir]
# defaults: ./animations  ->  ./public/animations-zips
npx remotion-animation-build animations public/animations-zips
```

### Programmatic

```ts
import { buildAnimations, compressAnimation } from "@asset1gmo/remotion-kit/compress";

// Build every folder under animations/ into public/animations-zips/<id>.zip
await buildAnimations({
  srcDir: "animations",
  outDir: "public/animations-zips",
  onBuilt: (r) => console.log(`built ${r.id} — ${r.zipBytes} bytes`),
});

// Or compress one folder and get the bytes without touching disk
const { bytes, manifest } = await compressAnimation("animations/promo");
```

`runtime.remotion` in the manifest defaults to the `remotion` version resolved from
your working directory; pass `remotionVersion` to set it explicitly.

---

## Publishing

Published as `@asset1gmo/remotion-kit` from the `asset1gmo` npm account.

```bash
npm login                 # log in as asset1gmo
npm whoami                # should print: asset1gmo
npm publish               # builds first (prepublishOnly) and publishes; access:public is set
```

Because npm versions are permanent, keep test releases off the `latest` tag with a
prerelease version and an explicit tag:

```bash
npm version 0.1.0-test.0 --no-git-tag-version
npm publish --tag test    # install with: npm install @asset1gmo/remotion-kit@test
```

## Notes

- **No CSP `eval` workarounds.** The loader evaluates the CJS bundle with
  `new Function`. The target apps are private with no strict CSP.
- **Asset URLs are not revoked.** Animations are small and cached for the page
  lifetime; blob URLs created for their images are kept alive deliberately.
