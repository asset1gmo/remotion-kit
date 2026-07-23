import type {
  AnimationEventCallback,
  AnimationEventName,
  AnimationEvents,
} from "./handle.js";

/**
 * Minimal typed event bus backing the Remotion handle's `addEventListener`.
 *
 * The Lottie backend does not use this — it forwards straight to lottie-web,
 * which already implements the same contract.
 */
export type Emitter = {
  on<T extends AnimationEventName>(
    name: T,
    cb: AnimationEventCallback<AnimationEvents[T]>,
  ): () => void;
  off<T extends AnimationEventName>(
    name: T,
    cb?: AnimationEventCallback<AnimationEvents[T]>,
  ): void;
  emit<T extends AnimationEventName>(name: T, payload: AnimationEvents[T]): void;
  clear(): void;
};

type AnyCallback = (args: never) => void;

export function createEmitter(): Emitter {
  const listeners = new Map<AnimationEventName, Set<AnyCallback>>();

  return {
    on(name, cb) {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(cb as AnyCallback);
      return () => {
        set.delete(cb as AnyCallback);
      };
    },
    off(name, cb) {
      if (cb === undefined) listeners.delete(name);
      else listeners.get(name)?.delete(cb as AnyCallback);
    },
    emit(name, payload) {
      const set = listeners.get(name);
      if (!set) return;
      // Copy: a listener may unsubscribe itself while we iterate.
      for (const cb of [...set]) (cb as (args: unknown) => void)(payload);
    },
    clear() {
      listeners.clear();
    },
  };
}
