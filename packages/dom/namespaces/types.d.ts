import { delegatedEventsSymbol } from "./on.js"

declare global {
  namespace space {
    interface DelegatedEvents {
      [type: string]: EventListener<Element>[]
    }
    interface Element {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface Namespaces {
      attr: Namespace<string, unknown>
      on: Namespace<string, EventListener<Element>>
      prop: Namespace<string | number | symbol, unknown>
      style: Namespace<string, unknown>
      classList: Namespace<string, BooleanLike>
      use: Namespace<Directive<unknown> | string, unknown>
    }
  }
}

export {}
