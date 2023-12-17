// deno-lint-ignore-file ban-types no-explicit-any
declare global {
  namespace space {
    interface Element extends Or<SVGElement, HTMLElement> {
      parentElement: Element | null
      [prop: string | number | symbol]: unknown
    }
    type BooleanLike = "true" | "false" | boolean
    interface Directives {
      [directive: string]: Directive<any>
    }
    interface Components {
      [component: string]: Component<any>
    }
    interface Directive<T> {
      (elt: Element, value: Resolved<T>): void
    }
    interface Namespace<A, T> {
      (elt: Element, arg: A, value: T): void
    }
    interface Namespaces {
      [namespace: string]: Namespace<any, any>
    }
    interface Event<T> extends Or<globalThis.Event, {}> {
      currentTarget: T & EventTarget
      target: T & EventTarget
    }
    interface EventListener<T> {
      (this: T | void, event: Event<T>): void
    }
    type Resolvable<T> = T | (() => T)
    type Resolved<T> = T extends (() => unknown) ? ReturnType<T>
      : T extends ((...args: unknown[]) => unknown) ? T
      : T
    type ComponentProps<T extends Record<string, any>> = Props<T, Children>
    type Children = { children: Slot }
    type Or<Base, Extends> = {
      [K in keyof Base | keyof Extends]: K extends keyof Base & keyof Extends
        ? Base[K] | Extends[K]
        : K extends keyof Extends ? Extends[K]
        : K extends keyof Base ? Base[K]
        : never
    }
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
