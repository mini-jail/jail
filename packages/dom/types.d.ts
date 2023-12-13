// deno-lint-ignore-file no-explicit-any
declare global {
  namespace space {
    type BooleanLike = "true" | "false" | boolean
    interface DOMElement extends globalThis.Element {
      [unknown: string | number | symbol]: any
    }
    interface DOMNode extends globalThis.Node {
      [unknown: string | number | symbol]: any
    }
    interface DOMChildNode extends globalThis.ChildNode {
      [unknown: string | number | symbol]: any
    }
    interface DOMParentNode extends globalThis.ParentNode {
      [unknown: string | number | symbol]: any
    }
    interface Directives {
      [directive: string]: Directive<any>
    }
    interface Components {
      [component: string]: Component<any>
    }
    interface Directive<T> {
      (elt: DOMElement, value: Resolved<T>): void
    }
    interface Namespace<A, T> {
      (elt: DOMElement, arg: A, value: T): void
    }
    interface Namespaces {
      [namespace: string]: Namespace<any, any>
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
    type ComponentProps<T extends Record<string, any>> = Props<T, Children>
    type Children = { children: Slot }
    type Props<Base, Extends> = {
      readonly [K in keyof Base | keyof Extends]: Resolved<
        K extends keyof Base & keyof Extends ? Base[K] | Extends[K]
          : K extends keyof Extends ? Extends[K]
          : K extends keyof Base ? Base[K]
          : never
      >
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
