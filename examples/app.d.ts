export interface AnimateDirective {
  frames: Keyframe[]
  options: KeyframeAnimationOptions
}

declare global {
  namespace jail {
    interface Directives {
      animate: AnimateDirective
    }
  }
}
