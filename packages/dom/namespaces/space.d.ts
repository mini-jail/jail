import { delegatedEventsSymbol } from "./on.js"

declare global {
  namespace space {
    interface DelegatedEvents {
      [type: string]: EventListener<Element, Event<Element>>[]
    }
    interface ParentNode {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface Element {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface Namespaces {
      attr: NamespaceDirective<unknown, string>
      on: NamespaceDirective<EventListener<Element, Event<Element>>, string>
      prop: NamespaceDirective<unknown, string | number | symbol>
      style: NamespaceDirective<unknown, string>
      use: NamespaceDirective<unknown, Directive<unknown> | string>
    }
  }
}

export {}
