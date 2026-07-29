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

Loading is **two steps** — an async decode, then a synchronous mount:

1. **`unzipAnimation(url, options?)`** — async. Fetches and unzips/decodes a
   **URL** (dotLottie/`.json` → Lottie JSON, Remotion `.zip` → evaluated
   component) and loads the matching rendering engine. Returns a
   `PreparedAnimation` (plain data). All the network I/O lives here.
2. **`loadAnimation({ container, animation, … })`** — synchronous. Mounts the
   prepared animation and returns an **`AnimationHandle`** — a controllable
   instance shaped **exactly like a lottie-web `AnimationItem`**: same methods
   (`play`/`pause`/`setSpeed`/`goToAndStop`/…), same live properties
   (`currentFrame`, `totalFrames`, `isPaused`, …), same events (`enterFrame`,
   `complete`, `loopComplete`, `DOMLoaded`, …). Driving a Remotion `.zip` is
   identical to driving a Lottie file.

```ts
import { unzipAnimation, loadAnimation } from "@asset1gmo/remotion-kit";
import type { AnimationHandle, PreparedAnimation } from "@asset1gmo/remotion-kit";

// 1. async — fetch + decode (do this once; reuse the result to remount)
const prepared: PreparedAnimation = await unzipAnimation("/animations/promo.zip");

// 2. sync — mount
const anim: AnimationHandle = loadAnimation({
  container: el,
  animation: prepared,
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

`prepared` is plain data — `.data` (Lottie JSON) or `.component` + `.manifest`
(Remotion) — and can be mounted more than once.

### Lottie JSON you already have

`unzipAnimation` only takes URLs. If you already hold decoded Lottie JSON (a
bundled `.json` import, an API payload), there's nothing to fetch — build the
prepared object yourself and mount it synchronously. Since `unzipAnimation` never
runs, register the engine once by importing + calling **`registerLottieEngine()`**
at module level. That import is what statically bundles `lottie-web` into *that*
module (only where you opt in), and makes the mount fully synchronous:

```ts
import { registerLottieEngine, loadAnimation } from "@asset1gmo/remotion-kit";

registerLottieEngine(); // module level — pulls in lottie-web here, registers the engine

// ...later, at mount — no async:
loadAnimation({ container: el, animation: { kind: "lottie", data: myLottieJson } });
```

(URL sources don't need this — `unzipAnimation` registers the engine itself.)

### Recoloring / theming (Lottie only)

There's no `transform` option — transform the decoded JSON yourself and mount it.
`prepared.data` is mutable, and the engine reads it at mount, so assign a new
object before `loadAnimation`:

```ts
const prepared = await unzipAnimation("/animations/logo.lottie");
if (prepared.kind === "lottie") {
  prepared.data = recolorToTheme(prepared.data); // a NEW object — don't mutate in place
}
loadAnimation({ container: el, animation: prepared });
```

### Routing by format

`url` is routed by extension; override with `options.format` for URLs that don't
carry one (signed CDN links, blob URLs, API endpoints):

| `url` | Format | Backend |
| --- | --- | --- |
| `*.zip` | Remotion code bundle | Remotion `<Player>` in the container |
| `*.json` | raw Lottie JSON | lottie-web |
| `*.lottie` | dotLottie (zip of Lottie JSON, v1 + v2, images inlined) | lottie-web |

```ts
const prepared = await unzipAnimation(signedUrl, { format: "remotion" });
```

Each backend registers a mount function, and `loadAnimation` looks it up by
`kind` — so `loadAnimation` itself imports no engine. **Neither engine is in the
static bundle by default:** `unzipAnimation` loads them via dynamic `import()`, so
a Lottie-only app never ships Remotion, and an app that only loads URLs ships
neither statically. `lottie-web` becomes static **only** in a module that imports
`registerLottieEngine` — the opt-in for mounting raw JSON synchronously — so you
pay for it exactly where you use it.

### Remotion vs lottie-web parity notes

The handle is faithful, with a few mechanism differences on the Remotion backend:

- **Reverse** (`setDirection(-1)`) is driven by a `requestAnimationFrame` loop that
  seeks backwards, since Remotion's Player has no native reverse.
- **Segments** (`setSegment`/`playSegments`/`resetSegments`) map onto the Player's
  `inFrame`/`outFrame`.
- **`setSpeed`** re-renders the Player.
- **Marker names** (string args to `goToAndStop`/`goToAndPlay`) and a **numeric
  `loop` count** are lottie-only; `renderer`/`assetsPath` config is ignored for
  `.zip`.

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

Published as `@asset1gmo/remotion-kit`. After a one-time setup, every push to
`main` that bumps the version publishes automatically via GitHub Actions
([.github/workflows/publish.yml](.github/workflows/publish.yml)).

### First publish (manual, once)

The package must exist on npm before Trusted Publishing can be configured. The
account uses 2FA, so pass an OTP:

```bash
npm whoami                        # asset1gmo
npm publish --otp=<6-digit code>  # builds via prepublishOnly; access:public is set
```

### Enable auto-publish (one-time)

1. On npmjs.com → the package → **Settings → Trusted Publisher**, add a GitHub
   Actions publisher: repo `asset1gmo/remotion-kit`, workflow `publish.yml`.
2. That's it — no token or secret. OIDC authenticates CI and adds provenance.

### Releasing thereafter — just push

Every push to `main` publishes the **next patch** automatically. The workflow
reads the current version from npm, increments the patch, and publishes it — you
never edit the version:

```bash
git commit -am "whatever you changed"
git push           # -> CI publishes the next patch (e.g. 0.1.1, then 0.1.2, ...)
```

Notes on this model:

- **Every push to `main` is a release**, including docs-only pushes. Batch work
  on a branch and merge when you actually want a version out.
- The `version` field in `package.json` is **not** the source of truth — npm is.
  CI computes the next number from the registry and never commits back to git.
- To jump a **minor/major** (auto-bump only does patches), publish that base
  version once manually (`npm version minor && npm publish --otp=<code>`); CI then
  keeps patching from there (0.2.0 → 0.2.1 → …).

> **Token alternative:** instead of Trusted Publishing you can store an npm
> **automation** token as the `NPM_TOKEN` repo secret and publish with
> `NODE_AUTH_TOKEN`. It works today but npm is deprecating 2FA-bypass tokens, so
> OIDC is preferred.

## Notes

- **No CSP `eval` workarounds.** The loader evaluates the CJS bundle with
  `new Function`. The target apps are private with no strict CSP.
- **Asset URLs are not revoked.** Animations are small and cached for the page
  lifetime; blob URLs created for their images are kept alive deliberately.
