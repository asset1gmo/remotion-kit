export function createEmitter() {
    const listeners = new Map();
    return {
        on(name, cb) {
            let set = listeners.get(name);
            if (!set) {
                set = new Set();
                listeners.set(name, set);
            }
            set.add(cb);
            return () => {
                set.delete(cb);
            };
        },
        off(name, cb) {
            if (cb === undefined)
                listeners.delete(name);
            else
                listeners.get(name)?.delete(cb);
        },
        emit(name, payload) {
            const set = listeners.get(name);
            if (!set)
                return;
            // Copy: a listener may unsubscribe itself while we iterate.
            for (const cb of [...set])
                cb(payload);
        },
        clear() {
            listeners.clear();
        },
    };
}
