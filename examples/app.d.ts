declare global {
  namespace jail {
    interface ExtendableDirectiveMap {
      animate: { frames: Keyframe[]; options: KeyframeAnimationOptions }
    }
  }
}
export {}
