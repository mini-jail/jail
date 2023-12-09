// deno-lint-ignore-file no-explicit-any
declare global {
  namespace space {
    interface Element extends globalThis.Element {
      [unknown: string | number | symbol]: any
    }
    interface Node extends globalThis.ChildNode {
      [unknown: string | number | symbol]: any
    }
    interface NamespaceDirective<T, A> {
      (elt: Element, arg: A, value: T): void
    }
    interface Namespaces {
      [namespace: string]: NamespaceDirective<any, any>
    }
    interface Event<T extends Element = Element> extends globalThis.Event {
      currentTarget: T & EventTarget
      target: T & EventTarget
      [unknown: string | number | symbol]: any
    }
    interface EventListener<
      T extends Element = Element,
      E extends Event = Event,
    > {
      (this: T, event: E): void
    }
    type ResolvedValue<T> = T extends (() => unknown) ? ReturnType<T>
      : T extends ((...args: unknown[]) => unknown) ? T
      : T
  }
}

export {}
