import type { AnimationEventCallback, AnimationEventName, AnimationEvents } from "./handle.js";
/**
 * Minimal typed event bus backing the Remotion handle's `addEventListener`.
 *
 * The Lottie backend does not use this — it forwards straight to lottie-web,
 * which already implements the same contract.
 */
export type Emitter = {
    on<T extends AnimationEventName>(name: T, cb: AnimationEventCallback<AnimationEvents[T]>): () => void;
    off<T extends AnimationEventName>(name: T, cb?: AnimationEventCallback<AnimationEvents[T]>): void;
    emit<T extends AnimationEventName>(name: T, payload: AnimationEvents[T]): void;
    clear(): void;
};
export declare function createEmitter(): Emitter;
