declare global {
  namespace jail {
    type DOMElement = HTMLElement | SVGElement

    interface Template {
      fragment: DocumentFragment
      hasAttributes: boolean
      hasInsertions: boolean
    }

    interface Component<
      P extends unknown[] = unknown[],
      R = unknown,
    > {
      (...params: P): R
    }

    interface Binding<T> {
      readonly value: T
      readonly rawValue: Signal<T> | Ref<T> | T
      readonly arg: string | null
      readonly modifiers: { [key: string]: boolean } | null
    }

    interface AppInjection {
      node: Node | null
      anchor: ChildNode | null
      currentNodes: ChildNode[] | null
      rootElement: DOMElement | null
      rootComponent: Component
      cleanup: Cleanup
      directives: { [name: string]: Directive }
    }

    interface Directive<T = unknown> {
      (elt: DOMElement, binding: Binding<T>): void
    }
  }
}

export function component<
  T extends (...args: unknown[]) => unknown,
  P extends Parameters<T>,
  R extends ReturnType<T>,
>(component: jail.Component<P, R>): jail.Component<P, R>

export function directive<T>(name: string, directive: jail.Directive<T>): void

export function mount(
  rootElement: jail.DOMElement,
  rootComponent: jail.Component,
): jail.Cleanup

export function template(strings: TemplateStringsArray): DocumentFragment
export function template(
  strings: TemplateStringsArray,
  ...args: unknown[]
): DocumentFragment
