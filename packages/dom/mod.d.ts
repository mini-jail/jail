declare global {
  namespace jail {
    type DOMElement = (HTMLElement | SVGElement) & {
      name?: string
    }

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
      directives: Directives
    }

    interface Directive<T = unknown> {
      (elt: DOMElement, binding: Binding<T>): void
    }

    type DocumentFragment = {
      querySelectorAll(selectors: string): Iterable<DOMElement>
      cloneNode(deep?: boolean): DocumentFragment
    }

    type Directives = ExtendableDirectiveMap

    interface ExtendableDirectiveMap {
      on: (this: DOMElement, event: Event) => void
      ref: Ref<DOMElement> | Signal<DOMElement> | ((elt: DOMElement) => void)
      show: boolean
      html: string
      text: string
      style: string
      bind: any
    }

    interface ExtendableInjectionMap {
      "jail/dom/app": AppInjection
    }
  }
}

export function component<
  T extends (...args: unknown[]) => unknown,
  P extends Parameters<T>,
  R extends ReturnType<T>,
>(component: jail.Component<P, R>): jail.Component<P, R>

export function directive<K extends keyof jail.Directives>(
  name: K,
  directive: jail.Directive<jail.Directives[K]>,
): void
export function directive<T>(name: string, directive: jail.Directive<T>): void
export function directive(name: string, directive: jail.Directive<any>): void

export function mount(
  rootElement: jail.DOMElement,
  rootComponent: jail.Component,
): jail.Cleanup

export function template(strings: TemplateStringsArray): DocumentFragment
export function template(
  strings: TemplateStringsArray,
  ...args: unknown[]
): DocumentFragment

export function createTemplateString(strings: TemplateStringsArray): string
export function createTemplateString(strings: string[]): string
