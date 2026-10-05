// pose-detection imports `Pose` from '@mediapipe/pose' for BlazePose's MediaPipe runtime.
// that package is an old-style script with no exports, which Vite cannot bundle.
// we only use MoveNet, which never uses it, so this stand-in only has to exist.
export class Pose {}
