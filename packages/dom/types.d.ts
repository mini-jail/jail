import type { AppInjectionKey } from "./mod.js"

export type DOMElement = HTMLElement | SVGElement

export type TemplateResult = Node | Node[] | undefined

export interface Binding<Type = any> {
  readonly value: Type
  readonly rawValue: (() => Type) | Type
  readonly arg: string | null
  readonly modifiers: Modifiers | null
}

export type Modifiers = { [key: string]: boolean }

export interface App {
  directives: DirectiveMap
  components: ComponentMap
}

export interface Directive<Type = any> {
  (elt: DOMElement, binding: Binding<Type>): void
}

export interface RootComponent {
  (): any
}

export interface Component<Props extends Properties = Properties> {
  (props: Props): any
}

export type Properties = {
  [prop: string]: any
}

declare global {
  interface DirectiveMap {
    on?: (this: DOMElement, ev: Event) => void
    ref?: (elt: DOMElement) => void
    show?: boolean
    if?: boolean
    html?: string
    text?: string
    style?: string
    bind?: any
  }

  interface ComponentMap {
    [name: string]: Component<any>
  }

  interface InjectionMap {
    [AppInjectionKey]?: App
  }

  interface DocumentFragment {
    querySelectorAll(selectors: string): Iterable<DOMElement>
  }
}
