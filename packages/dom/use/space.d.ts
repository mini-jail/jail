import { ifSymbol } from "./if.js"
import { textSymbol } from "./text.js"

declare global {
  namespace space {
    type BooleanLike = "true" | "false" | boolean
    interface Element {
      [ifSymbol]?: Text
      [textSymbol]?: Text
    }
    interface AnimateValue extends KeyframeEffectOptions {
      keyframes: Keyframe[]
    }
    interface Directives {
      Animate: Directive<AnimateValue>
      If: Directive<BooleanLike>
      Show: Directive<BooleanLike>
      Text: Directive<string>
    }
  }
}

export {}
