/**
 * The animation handle contract.
 *
 * Deliberately shaped like lottie-web's `AnimationItem`: same property names,
 * same method signatures, same event names and payloads. Callers drive a
 * Remotion `.zip` with exactly the API they already use for Lottie, so the
 * eventual Lottie -> Remotion migration is a change of file extension and
 * nothing else.
 *
 * The event/segment/direction types below are *vendored* rather than re-exported
 * from lottie-web on purpose — they define this package's contract permanently,
 * and must keep working after `src/lottie/` and the lottie-web dependency are
 * removed. They are structurally identical to lottie-web's, so a real
 * `AnimationItem` satisfies them without adaptation.
 */
import type { AnimationItem } from "lottie-web";
import type { PlayerRef } from "@remotion/player";
export type AnimationDirection = 1 | -1;
/** `[startFrame, endFrame]`, as in lottie-web. */
export type AnimationSegment = [number, number];
/** lottie-web render engine. Ignored by the Remotion backend. */
export type RendererType = "svg" | "canvas" | "html";
export type AnimationEventName = "drawnFrame" | "enterFrame" | "loopComplete" | "complete" | "segmentStart" | "destroy" | "config_ready" | "data_ready" | "DOMLoaded" | "error" | "data_failed" | "loaded_images";
export type AnimationEventCallback<T = unknown> = (args: T) => void;
export interface BMCompleteEvent {
    direction: number;
    type: "complete";
}
export interface BMCompleteLoopEvent {
    currentLoop: number;
    direction: number;
    totalLoops: number;
    type: "loopComplete";
}
export interface BMDestroyEvent {
    type: "destroy";
}
export interface BMEnterFrameEvent {
    /** Current frame, relative to the active segment's first frame. */
    currentTime: number;
    direction: number;
    /** Total frames in the active segment. */
    totalTime: number;
    type: "enterFrame";
}
export interface BMSegmentStartEvent {
    firstFrame: number;
    totalFrames: number;
    type: "segmentStart";
}
/** Payload delivered for each event name. */
export interface AnimationEvents {
    DOMLoaded: undefined;
    complete: BMCompleteEvent;
    config_ready: undefined;
    data_failed: undefined;
    data_ready: undefined;
    destroy: BMDestroyEvent;
    drawnFrame: BMEnterFrameEvent;
    enterFrame: BMEnterFrameEvent;
    error: undefined;
    loaded_images: undefined;
    loopComplete: BMCompleteLoopEvent;
    segmentStart: BMSegmentStartEvent;
}
/**
 * Controllable animation instance returned by `loadAnimation`, whatever the
 * source format was.
 *
 * Backend differences are documented per member. The Remotion backend
 * implements every member; the notes call out where the underlying mechanism
 * differs (e.g. reverse playback is driven frame-by-frame rather than natively).
 */
export type AnimationHandle = {
    /** Which backend is driving this animation. */
    readonly kind: "remotion" | "lottie";
    /**
     * The underlying instance — a `PlayerRef` (Remotion) or an `AnimationItem`
     * (lottie-web) — for anything the normalized surface doesn't cover.
     */
    readonly native: PlayerRef | AnimationItem;
    readonly name: string;
    readonly animationID: string;
    readonly isLoaded: boolean;
    readonly currentFrame: number;
    readonly currentRawFrame: number;
    /** First frame of the active segment. */
    readonly firstFrame: number;
    /** Frames in the active segment. */
    readonly totalFrames: number;
    readonly frameRate: number;
    readonly frameMult: number;
    readonly playSpeed: number;
    readonly playDirection: number;
    /** Completed loops since load. */
    readonly playCount: number;
    readonly isPaused: boolean;
    readonly autoplay: boolean;
    readonly loop: boolean | number;
    readonly timeCompleted: number;
    readonly segmentPos: number;
    readonly isSubframeEnabled: boolean;
    readonly segments: AnimationSegment | AnimationSegment[];
    play(): void;
    pause(): void;
    /** Pause and return to the first frame of the active segment. */
    stop(): void;
    togglePause(): void;
    /** Tear down the animation and empty the container. */
    destroy(): void;
    /**
     * Seek and pause. `value` is milliseconds unless `isFrame` is true — matching
     * lottie-web's default. String marker names are lottie-only.
     */
    goToAndStop(value: number | string, isFrame?: boolean): void;
    /** Seek and play. Same `value` / `isFrame` semantics as {@link goToAndStop}. */
    goToAndPlay(value: number | string, isFrame?: boolean): void;
    /** 1 = normal speed. */
    setSpeed(speed: number): void;
    /** 1 = forward, -1 = reverse. */
    setDirection(direction: AnimationDirection): void;
    setLoop(isLooping: boolean): void;
    /** Restrict playback to `[init, end]` without changing the playing state. */
    setSegment(init: number, end: number): void;
    /** Play `segments`; `forceFlag` applies them immediately instead of after the current loop. */
    playSegments(segments: AnimationSegment | AnimationSegment[], forceFlag?: boolean): void;
    /** Return to the full animation range. */
    resetSegments(forceFlag?: boolean): void;
    /** Remotion renders on whole frames; this is a no-op there. */
    setSubframe(useSubFrames: boolean): void;
    /** Duration of the active segment, in seconds unless `inFrames` is true. */
    getDuration(inFrames?: boolean): number;
    resize(width?: number, height?: number): void;
    hide(): void;
    show(): void;
    /** Returns an unsubscribe function. */
    addEventListener<T extends AnimationEventName>(name: T, callback: AnimationEventCallback<AnimationEvents[T]>): () => void;
    /** Omit `callback` to remove every listener for `name`. */
    removeEventListener<T extends AnimationEventName>(name: T, callback?: AnimationEventCallback<AnimationEvents[T]>): void;
    triggerEvent<T extends AnimationEventName>(name: T, args: AnimationEvents[T]): void;
};
/**
 * Which backend to use. `"auto"` (the default) routes on the `src` extension:
 * `.zip` -> Remotion, everything else -> Lottie. Set it explicitly for URLs
 * without a usable extension (signed CDN links, blob URLs, API endpoints).
 */
export type AnimationFormat = "auto" | "remotion" | "lottie";
export type LoadAnimationConfig = {
    /** DOM element to render into. Its contents are replaced. */
    container: HTMLElement;
    /**
     * URL of a `.zip` (Remotion bundle), `.json` (raw Lottie) or `.lottie`
     * (dotLottie) file — or already-parsed Lottie JSON (Lottie only).
     */
    src: string | Record<string, unknown>;
    /** Override extension-based routing. Default `"auto"`. */
    format?: AnimationFormat;
    /** Default `true`. A number means "loop N times" (Lottie only). */
    loop?: boolean | number;
    /** Default `true`. */
    autoplay?: boolean;
    /** Default `1`. */
    speed?: number;
    /** Default `1`. */
    direction?: AnimationDirection;
    /** Restrict playback to `[start, end]` from the first frame. */
    initialSegment?: AnimationSegment;
    /** Name reported by `handle.name`. Defaults to the manifest id / filename. */
    name?: string;
    /** lottie-web renderer. Default `"svg"`. */
    renderer?: RendererType;
    /** Base path lottie-web resolves external assets against. */
    assetsPath?: string;
    /**
     * Hook applied to the decoded Lottie JSON before render (e.g. theme colour
     * remapping). Must return a new object — do not mutate the input.
     */
    transform?: (data: Record<string, unknown>) => Record<string, unknown>;
};
