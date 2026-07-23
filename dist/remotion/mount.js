import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { loadBundle } from "./bundle.js";
import { createEmitter } from "../core/emitter.js";
/**
 * Mount a Remotion `.zip` into a container and adapt its `<Player>` to the
 * shared {@link AnimationHandle}, so a Remotion animation is driven with the
 * exact lottie-web API.
 *
 * Reached only via the lazy import in `load-animation.ts`, so the Remotion
 * runtime is code-split out of Lottie-only consumers.
 */
export async function mountRemotion(config) {
    const { container, src } = config;
    if (typeof src !== "string") {
        throw new Error("[remotion-animation] a Remotion (.zip) animation needs a URL `src`, not a parsed object.");
    }
    const { component, manifest } = await loadBundle(src);
    const ref = createRef();
    const root = createRoot(container);
    const handle = new RemotionHandle(ref, root, manifest, component, config);
    handle.render();
    await waitForRef(ref);
    handle.onMounted();
    return handle;
}
function waitForRef(ref, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        const tick = () => {
            if (ref.current)
                return resolve();
            if (performance.now() - start > timeoutMs) {
                return reject(new Error("[remotion-animation] Remotion Player did not mount in time"));
            }
            requestAnimationFrame(tick);
        };
        tick();
    });
}
/**
 * Adapts a `PlayerRef` to the lottie-web-shaped handle.
 *
 * Forward playback delegates to the native Player (smooth). Reverse playback
 * (`setDirection(-1)`) has no native equivalent, so it is driven by a
 * `requestAnimationFrame` loop that seeks backwards; the native Player is kept
 * paused while that runs. Segments map onto the Player's `inFrame`/`outFrame`.
 */
class RemotionHandle {
    constructor(ref, root, manifest, component, config) {
        this.ref = ref;
        this.root = root;
        this.manifest = manifest;
        this.component = component;
        this.kind = "remotion";
        this.em = createEmitter();
        this.inFrame = null;
        this.outFrame = null;
        this.mounted = false;
        this.loops = 0;
        this.prevFrame = 0;
        this.reverseRAF = 0;
        this.reverseLastTs = 0;
        this.onFrameUpdate = (e) => {
            const frame = e.detail.frame;
            // A forward wrap (frame jumped back to the segment start) is one completed
            // loop — the native Player restarts seamlessly without firing "ended".
            if (this.loopEnabled && this.direction === 1 && frame < this.prevFrame - 1) {
                this.loops += 1;
                this.emitLoopComplete();
            }
            this.prevFrame = frame;
            this.emitEnterFrame(frame);
        };
        this.onEnded = () => {
            this.playing = false;
            this.emitComplete();
        };
        this.isSubframeEnabled = false;
        this.fps = manifest.fps;
        this.duration = manifest.durationInFrames;
        this.rate = config.speed ?? 1;
        this.direction = config.direction ?? 1;
        this.loopEnabled = config.loop !== false && config.loop !== 0;
        this.playing = config.autoplay ?? true;
        if (config.initialSegment) {
            [this.inFrame, this.outFrame] = config.initialSegment;
        }
        this.name = config.name ?? manifest.name ?? manifest.id;
        this.animationID = manifest.id;
        this.autoplay = config.autoplay ?? true;
        this.loop = config.loop ?? true;
    }
    /** Re-render the Player with the current rate/segment/loop state. */
    render() {
        this.root.render(createElement(Player, {
            ref: this.ref,
            component: this.component,
            durationInFrames: this.duration,
            fps: this.fps,
            compositionWidth: this.manifest.width,
            compositionHeight: this.manifest.height,
            loop: this.loopEnabled,
            // The reverse driver owns playback while direction is -1, so never let
            // the native Player autoplay forward in that case.
            autoPlay: this.autoplay && this.direction === 1,
            playbackRate: this.rate,
            inFrame: this.inFrame,
            outFrame: this.outFrame,
            controls: false,
            clickToPlay: false,
            showVolumeControls: false,
            doubleClickToFullscreen: false,
            style: { width: "100%", height: "100%" },
        }));
    }
    /** Wire up native Player events once the ref exists, then announce load. */
    onMounted() {
        const p = this.player();
        p.addEventListener("frameupdate", this.onFrameUpdate);
        p.addEventListener("ended", this.onEnded);
        this.mounted = true;
        this.prevFrame = p.getCurrentFrame();
        // Parity with lottie-web's load sequence.
        this.em.emit("config_ready", undefined);
        this.em.emit("data_ready", undefined);
        this.em.emit("loaded_images", undefined);
        this.em.emit("DOMLoaded", undefined);
        if (this.playing && this.direction === -1)
            this.startReverse();
    }
    player() {
        const p = this.ref.current;
        if (!p)
            throw new Error("[remotion-animation] Player is not mounted");
        return p;
    }
    lo() {
        return this.inFrame ?? 0;
    }
    hi() {
        return this.outFrame ?? this.duration - 1;
    }
    emitEnterFrame(frame) {
        const payload = {
            currentTime: frame - this.lo(),
            totalTime: this.hi() - this.lo() + 1,
            direction: this.direction,
            type: "enterFrame",
        };
        this.em.emit("enterFrame", payload);
        this.em.emit("drawnFrame", { ...payload });
    }
    emitComplete() {
        this.em.emit("complete", { direction: this.direction, type: "complete" });
    }
    emitLoopComplete() {
        this.em.emit("loopComplete", {
            currentLoop: this.loops,
            totalLoops: typeof this.loop === "number" ? this.loop : 0,
            direction: this.direction,
            type: "loopComplete",
        });
    }
    // ── Reverse driver ────────────────────────────────────────────────────────
    startReverse() {
        this.stopReverse();
        this.player().pause();
        this.reverseLastTs = performance.now();
        const step = (ts) => {
            const dt = (ts - this.reverseLastTs) / 1000;
            this.reverseLastTs = ts;
            const lo = this.lo();
            const hi = this.hi();
            let frame = this.player().getCurrentFrame() - dt * this.fps * this.rate;
            if (frame <= lo) {
                if (this.loopEnabled) {
                    this.loops += 1;
                    this.emitLoopComplete();
                    frame = hi - (lo - frame);
                    if (frame < lo)
                        frame = hi;
                }
                else {
                    this.player().seekTo(lo);
                    this.emitEnterFrame(lo);
                    this.playing = false;
                    this.emitComplete();
                    this.reverseRAF = 0;
                    return;
                }
            }
            this.player().seekTo(frame);
            this.emitEnterFrame(frame);
            this.reverseRAF = requestAnimationFrame(step);
        };
        this.reverseRAF = requestAnimationFrame(step);
    }
    stopReverse() {
        if (this.reverseRAF) {
            cancelAnimationFrame(this.reverseRAF);
            this.reverseRAF = 0;
        }
    }
    toFrame(value, isFrame) {
        if (typeof value === "string") {
            const n = Number(value);
            if (Number.isNaN(n)) {
                console.warn(`[remotion-animation] marker names ("${value}") are not supported for Remotion animations; ignoring seek.`);
                return this.player().getCurrentFrame();
            }
            value = n;
        }
        return isFrame ? value : Math.round((value / 1000) * this.fps);
    }
    get frameMult() {
        return this.fps / 1000;
    }
    get native() {
        return this.player();
    }
    get isLoaded() {
        return this.mounted;
    }
    get currentFrame() {
        return this.ref.current?.getCurrentFrame() ?? this.lo();
    }
    get currentRawFrame() {
        return this.currentFrame;
    }
    get firstFrame() {
        return this.lo();
    }
    get totalFrames() {
        return this.hi() - this.lo() + 1;
    }
    get frameRate() {
        return this.fps;
    }
    get playSpeed() {
        return this.rate;
    }
    get playDirection() {
        return this.direction;
    }
    get playCount() {
        return this.loops;
    }
    get isPaused() {
        return !this.playing;
    }
    get timeCompleted() {
        return this.totalFrames;
    }
    get segmentPos() {
        return 0;
    }
    get segments() {
        return [this.lo(), this.hi()];
    }
    // ── Playback controls ──────────────────────────────────────────────────────
    play() {
        this.playing = true;
        if (this.direction === -1)
            this.startReverse();
        else {
            this.stopReverse();
            this.player().play();
        }
    }
    pause() {
        this.playing = false;
        this.stopReverse();
        this.player().pause();
    }
    stop() {
        this.pause();
        this.player().seekTo(this.lo());
    }
    togglePause() {
        if (this.playing)
            this.pause();
        else
            this.play();
    }
    goToAndStop(value, isFrame) {
        this.pause();
        this.player().seekTo(this.toFrame(value, isFrame));
    }
    goToAndPlay(value, isFrame) {
        this.player().seekTo(this.toFrame(value, isFrame));
        this.play();
    }
    setSpeed(speed) {
        this.rate = speed;
        this.render();
    }
    setDirection(direction) {
        if (direction === this.direction)
            return;
        this.direction = direction;
        if (!this.playing)
            return;
        if (direction === -1)
            this.startReverse();
        else {
            this.stopReverse();
            this.player().play();
        }
    }
    setLoop(isLooping) {
        this.loopEnabled = isLooping;
        this.render();
    }
    setSegment(init, end) {
        this.inFrame = init;
        this.outFrame = end;
        this.render();
    }
    playSegments(segments, _forceFlag) {
        const seg = (Array.isArray(segments[0]) ? segments[0] : segments);
        this.setSegment(seg[0], seg[1]);
        this.player().seekTo(seg[0]);
        this.play();
    }
    resetSegments(_forceFlag) {
        this.inFrame = null;
        this.outFrame = null;
        this.render();
    }
    setSubframe(_useSubFrames) {
        // Remotion renders on whole frames — nothing to toggle.
    }
    getDuration(inFrames) {
        return inFrames ? this.totalFrames : this.totalFrames / this.fps;
    }
    resize() {
        // The Player fills its container (100% width/height); resizing the
        // container is enough. Provided for API parity.
    }
    hide() {
        const el = this.player().getContainerNode();
        if (el)
            el.style.display = "none";
    }
    show() {
        const el = this.player().getContainerNode();
        if (el)
            el.style.display = "";
    }
    // ── Events ─────────────────────────────────────────────────────────────────
    addEventListener(name, callback) {
        return this.em.on(name, callback);
    }
    removeEventListener(name, callback) {
        this.em.off(name, callback);
    }
    triggerEvent(name, args) {
        this.em.emit(name, args);
    }
    destroy() {
        this.stopReverse();
        const p = this.ref.current;
        if (p) {
            p.removeEventListener("frameupdate", this.onFrameUpdate);
            p.removeEventListener("ended", this.onEnded);
        }
        this.em.emit("destroy", { type: "destroy" });
        this.em.clear();
        this.root.unmount();
    }
}
