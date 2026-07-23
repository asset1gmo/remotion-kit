/**
 * LOTTIE (TEMPORARY) — see the header note in `./decode.ts`.
 *
 * lottie-web's `AnimationItem` already *is* the handle contract (the contract
 * was modelled on it), so this adapter is a thin delegating shell: it adds
 * `kind`/`native` and forwards every member to the live `AnimationItem`. Getters
 * keep property reads (`currentFrame`, `isPaused`, …) live.
 */
import lottieWeb from "lottie-web";
import { loadLottie } from "./decode.js";
export async function mountLottie(config) {
    const { container, src } = config;
    let data = typeof src === "string" ? await loadLottie(src) : src;
    if (config.transform)
        data = config.transform(data);
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
    if (config.speed !== undefined && config.speed !== 1)
        item.setSpeed(config.speed);
    if (config.direction === -1)
        item.setDirection(-1);
    return makeLottieHandle(item);
}
function makeLottieHandle(item) {
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
        goToAndStop: (value, isFrame) => item.goToAndStop(value, isFrame),
        goToAndPlay: (value, isFrame) => item.goToAndPlay(value, isFrame),
        setSpeed: (speed) => item.setSpeed(speed),
        setDirection: (direction) => item.setDirection(direction),
        setLoop: (isLooping) => item.setLoop(isLooping),
        setSegment: (init, end) => item.setSegment(init, end),
        playSegments: (segments, forceFlag) => item.playSegments(segments, forceFlag),
        resetSegments: (forceFlag) => item.resetSegments(forceFlag ?? false),
        setSubframe: (useSubFrames) => item.setSubframe(useSubFrames),
        getDuration: (inFrames) => item.getDuration(inFrames),
        resize: (width, height) => item.resize(width, height),
        hide: () => item.hide(),
        show: () => item.show(),
        addEventListener: (name, callback) => item.addEventListener(name, callback),
        removeEventListener: (name, callback) => item.removeEventListener(name, callback),
        triggerEvent: (name, args) => item.triggerEvent(name, args),
    };
}
