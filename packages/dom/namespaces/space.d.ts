import { delegatedEventsSymbol } from "./on.js"

declare global {
  namespace space {
    interface DelegatedEvents {
      [type: string]: DOMEventListener<DOMElement, DOMEvent<DOMElement>>[]
    }
    interface DOMParentNode {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface DOMElement {
      [delegatedEventsSymbol]?: DelegatedEvents
    }
    interface Namespaces {
      attr: NamespaceDirective<unknown, string>
      on: NamespaceDirective<
        DOMEventListener<DOMElement, DOMEvent<DOMElement>>,
        string
      >
      prop: NamespaceDirective<unknown, string | number | symbol>
      style: NamespaceDirective<unknown, string>
      use: NamespaceDirective<unknown, Directive<unknown> | string>
    }
  }
}

export {}
