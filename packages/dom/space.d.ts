// deno-lint-ignore-file no-explicit-any
declare global {
  namespace space {
    interface DOMElement extends globalThis.Element {
      [unknown: string | number | symbol]: any
    }
    interface DOMNode extends globalThis.Node {
      [unknown: string | number | symbol]: any
    }
    interface DOMChildNode extends globalThis.ChildNode {
      parentNode: DOMParentNode
      childNodes: NodeListOf<ChildNode>
      [unknown: string | number | symbol]: any
    }
    interface DOMParentNode extends globalThis.ParentNode {
      parentNode: DOMParentNode | null
      childNodes: NodeListOf<ChildNode>
      [unknown: string | number | symbol]: any
    }
    interface Directives {
      [directive: string]: Directive<any>
    }
    interface Components {
      [component: string]: Component<any>
    }
    interface Directive<Type> {
      (elt: DOMElement, value: Resolved<Type>): void
    }
    interface NamespaceDirective<T, A> {
      (elt: DOMElement, arg: A, value: T): void
    }
    interface Namespaces {
      [namespace: string]: NamespaceDirective<any, any>
    }
    interface DOMEvent<T> extends globalThis.Event {
      currentTarget: T & EventTarget
      target: T & EventTarget
    }
    interface DOMEventListener<T> {
      (this: T | void, event: DOMEvent<T>): void
    }
    type Resolvable<T> = T | (() => T)
    type Resolved<T> = T extends (() => unknown) ? ReturnType<T>
      : T extends ((...args: unknown[]) => unknown) ? T
      : T
    type ComponentProps<T extends Record<string, any>> = Merge<T, Children>
    type Children = {
      children: RenderResult
    }
    type Merge<Base, Extends> = {
      [K in keyof Base | keyof Extends]: K extends keyof Base & keyof Extends
        ? Base[K] | Extends[K]
        : K extends keyof Extends ? Extends[K]
        : K extends keyof Base ? Base[K]
        : never
    }
    interface Component<Props extends ComponentProps<Record<string, any>>> {
      (props: Props): Slot
    }
    interface RootComponent {
      (): Slot
    }
  }
}

export {}
