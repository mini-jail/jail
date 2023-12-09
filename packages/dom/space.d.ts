// deno-lint-ignore-file no-explicit-any
declare global {
  namespace space {
    interface Element extends globalThis.Element {
      [unknown: string | number | symbol]: any
    }
    interface Node extends globalThis.Node {
      [unknown: string | number | symbol]: any
    }
    interface ChildNode extends globalThis.ChildNode {
      parentNode: ParentNode
      childNodes: NodeListOf<ChildNode>
      [unknown: string | number | symbol]: any
    }
    interface ParentNode extends globalThis.ParentNode {
      parentNode: ParentNode | null
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
      (elt: Element, value: Resolved<Type>): void
    }
    interface NamespaceDirective<T, A> {
      (elt: Element, arg: A, value: T): void
    }
    interface Namespaces {
      [namespace: string]: NamespaceDirective<any, any>
    }
    interface Event<T> extends globalThis.Event {
      currentTarget: T & EventTarget
      target: T & EventTarget
    }
    interface EventListener<T, E> {
      (this: T, event: E): void
    }
    type Resolved<T> = T extends (() => unknown) ? ReturnType<T>
      : T extends ((...args: unknown[]) => unknown) ? T
      : T
    type ComponentProps = { readonly [prop: string]: any }
    interface Component<Props extends ComponentProps> {
      (props: Props): Slot
    }
    interface RootComponent {
      (): Slot
    }
  }
}

export {}
