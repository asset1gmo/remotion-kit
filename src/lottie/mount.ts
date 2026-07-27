/**
 * LOTTIE (TEMPORARY) — see the header note in `./decode.ts`.
 *
 * `prepareLottie` does the async half (fetch + decode + transform) and returns a
 * prepared animation whose `mount` runs lottie-web synchronously. lottie-web's
 * `AnimationItem` already *is* the handle contract, so the handle is a thin
 * delegating shell.
 */
import lottieWeb from "lottie-web";
import type { AnimationItem } from "lottie-web";
import { loadLottie, type LottieData } from "./decode.js";
import type { MountConfig, PreparedLottieAnimation } from "../core/config.js";
import type {
  AnimationDirection,
  AnimationEventCallback,
  AnimationEventName,
  AnimationEvents,
  AnimationHandle,
  AnimationSegment,
} from "../core/handle.js";

/** Fetch + decode (+ transform) a Lottie source into a ready-to-mount animation. */
export async function prepareLottie(
  src: string | Record<string, unknown>,
  transform?: (data: LottieData) => LottieData,
): Promise<PreparedLottieAnimation> {
  let data: LottieData =
    typeof src === "string" ? await loadLottie(src) : (src as LottieData);
  if (transform) data = transform(data);

  return {
    kind: "lottie",
    data,
    mount(container: HTMLElement, config: MountConfig = {}): AnimationHandle {
      const item = lottieWeb.loadAnimation({
        container,
        renderer: config.renderer ?? "svg",
        loop: config.loop ?? true,
        autoplay: config.autoplay ?? true,
        name: config.name,
        assetsPath: config.assetsPath,
        initialSegment: config.initialSegment,
        animationData: data,
      });
      if (config.speed !== undefined && config.speed !== 1) {
        item.setSpeed(config.speed);
      }
      if (config.direction === -1) item.setDirection(-1);
      return makeLottieHandle(item);
    },
  };
}

function makeLottieHandle(item: AnimationItem): AnimationHandle {
  return {
    kind: "lottie",
    native: item,

    get name() {
      return item.name;
    },
    get animationID() {
      return item.animationID;
    },
    get isLoaded() {
      return item.isLoaded;
    },
    get currentFrame() {
      return item.currentFrame;
    },
    get currentRawFrame() {
      return item.currentRawFrame;
    },
    get firstFrame() {
      return item.firstFrame;
    },
    get totalFrames() {
      return item.totalFrames;
    },
    get frameRate() {
      return item.frameRate;
    },
    get frameMult() {
      return item.frameMult;
    },
    get playSpeed() {
      return item.playSpeed;
    },
    get playDirection() {
      return item.playDirection;
    },
    get playCount() {
      return item.playCount;
    },
    get isPaused() {
      return item.isPaused;
    },
    get autoplay() {
      return item.autoplay;
    },
    get loop() {
      return item.loop;
    },
    get timeCompleted() {
      return item.timeCompleted;
    },
    get segmentPos() {
      return item.segmentPos;
    },
    get isSubframeEnabled() {
      return item.isSubframeEnabled;
    },
    get segments() {
      return item.segments;
    },

    play: () => item.play(),
    pause: () => item.pause(),
    stop: () => item.stop(),
    togglePause: () => item.togglePause(),
    destroy: () => item.destroy(),
    goToAndStop: (value: number | string, isFrame?: boolean) =>
      item.goToAndStop(value, isFrame),
    goToAndPlay: (value: number | string, isFrame?: boolean) =>
      item.goToAndPlay(value, isFrame),
    setSpeed: (speed: number) => item.setSpeed(speed),
    setDirection: (direction: AnimationDirection) => item.setDirection(direction),
    setLoop: (isLooping: boolean) => item.setLoop(isLooping),
    setSegment: (init: number, end: number) => item.setSegment(init, end),
    playSegments: (
      segments: AnimationSegment | AnimationSegment[],
      forceFlag?: boolean,
    ) => item.playSegments(segments, forceFlag),
    resetSegments: (forceFlag?: boolean) => item.resetSegments(forceFlag ?? false),
    setSubframe: (useSubFrames: boolean) => item.setSubframe(useSubFrames),
    getDuration: (inFrames?: boolean) => item.getDuration(inFrames),
    resize: (width?: number, height?: number) => item.resize(width, height),
    hide: () => item.hide(),
    show: () => item.show(),

    addEventListener: <T extends AnimationEventName>(
      name: T,
      callback: AnimationEventCallback<AnimationEvents[T]>,
    ) => item.addEventListener(name, callback),
    removeEventListener: <T extends AnimationEventName>(
      name: T,
      callback?: AnimationEventCallback<AnimationEvents[T]>,
    ) => item.removeEventListener(name, callback),
    triggerEvent: <T extends AnimationEventName>(
      name: T,
      args: AnimationEvents[T],
    ) => item.triggerEvent(name, args),
  };
}
