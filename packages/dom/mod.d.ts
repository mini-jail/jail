declare global {
  namespace jail {
    type DOMElement = HTMLElement | SVGElement

    interface Template {
      fragment: Fragment
      hasAttributes: boolean
      hasInsertions: boolean
      hasComponents: boolean
    }

    interface Binding<T> {
      readonly value: T
      readonly rawValue: Signal<T> | Ref<T> | T
      readonly arg: string | null
      readonly modifiers: Modifiers | null
    }

    type Modifiers = { [key: string]: boolean }

    interface AppInjection {
      directives: Directives
      components: Components
    }

    interface Directive<T = unknown> {
      (elt: DOMElement, binding: Binding<T>): void
    }

    interface Component<P extends object = {}> {
      (params: P, ...children: globalThis.Node[]): any
    }

    type Fragment = {
      querySelectorAll(selectors: `slot${string}`): Iterable<HTMLSlotElement>
      querySelectorAll(
        selectors: `template${string}`,
      ): Iterable<HTMLTemplateElement>
      querySelectorAll(selectors: string): Iterable<DOMElement>
      cloneNode(deep?: boolean): Fragment
    } & DocumentFragment

    type Directives = ExtendableDirectiveMap
    type Components = ExtendableComponentMap

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

    interface ExtendableComponentMap {}
  }
}

export function createDirective<K extends keyof jail.Directives>(
  name: K,
  directive: jail.Directive<jail.Directives[K]>,
): void
export function createDirective<T>(
  name: string,
  directive: jail.Directive<T>,
): void
export function createDirective(name: string, directive: jail.Directive): void

export function createComponent<K extends keyof jail.ExtendableComponentMap>(
  name: K,
  component: jail.Component<jail.ExtendableComponentMap[K]>,
): void
export function createComponent<T extends object>(
  name: string,
  component: jail.Component<T>,
): void
export function createComponent(name: string, component: jail.Component): void

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
