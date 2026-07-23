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
export {};
