import { whenSymbol } from "./when.js"
import { textSymbol } from "./text.js"

declare global {
  namespace space {
    interface DOMElement {
      [whenSymbol]?: Text
      [textSymbol]?: Text
    }
    interface AnimateValue extends KeyframeEffectOptions {
      keyframes: Keyframe[]
    }
    interface RefValue {
      (elt: DOMElement): void
    }
    interface Directives {
      animate: Directive<AnimateValue>
      when: Directive<BooleanLike>
      show: Directive<BooleanLike>
      text: Directive<string>
      ref: Directive<RefValue>
    }
  }
}

export {}
