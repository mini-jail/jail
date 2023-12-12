import { delegatedEventsSymbol } from "./on.js"

declare global {
  namespace space {
    interface DelegatedEvents {
      [type: string]: DOMEventListener<DOMElement>[]
    }
    interface DOMParentNode {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface DOMElement {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface Namespaces {
      attr: Namespace<string, unknown>
      on: Namespace<string, DOMEventListener<DOMElement>>
      prop: Namespace<string | number | symbol, unknown>
      style: Namespace<string, unknown>
      classList: Namespace<string, BooleanLike>
      use: Namespace<Directive<unknown> | string, unknown>
    }
  }
}

export {}
