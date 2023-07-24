import type { AppInjectionKey } from "jail/dom"
import type { Cleanup } from "jail/signal"

declare module "jail/signal" {
  interface InjectionValues {
    [AppInjectionKey]?: App
  }
}

declare module "jail/dom" {
  type DOMElement = HTMLElement | SVGElement
  type DOMEvent = Event & { currentTarget: EventTarget & DOMElement }
  type DOMListener = (this: DOMElement, event: DOMEvent) => void
  type ArgSlot =
    | string
    | number
    | Node
    | DOMElement
    | boolean
    | null
    | undefined
  type ArgAttr = ArgSlot | ArgSlot[] | (() => ArgSlot) | DOMListener | {
    [key: string]: any
  }
  type Arg =
    | ArgSlot
    | ArgAttr
    | (ArgSlot | ArgAttr)[]
    | (() => ArgSlot | ArgAttr)
  type TemplateResult = Node | Node[] | undefined
  interface Modifiers {
    readonly [key: string]: boolean
  }
  interface Binding<Type = any> {
    readonly value: Type
    readonly rawValue: (() => Type) | Type
    readonly arg: string | null
    readonly modifiers: Modifiers | null
  }
  type Properties = { [prop: string]: any }
  type Directive<Type = any> = (elt: DOMElement, binding: Binding<Type>) => void
  type Component<Props extends Properties = Properties> = (props: Props) => any
  type RootComponent = () => any
  interface DirectiveValues {
    [directive: string]: any
  }
  interface ComponentValues {
    [component: `${Uppercase<string>}${string}`]: Properties
  }
  interface App {
    directives: DirectiveValues
    components: ComponentValues
  }
  const AppInjectionKey: unique symbol
  function createDirective<Name extends keyof DirectiveValues>(
    name: Name,
    directive: Directive<DirectiveValues[Name]>,
  ): void
  function createDirective<Type>(
    name: string,
    directive: Directive<Type>,
  ): void
  function createComponent<Name extends keyof ComponentValues>(
    name: Name,
    component: Component<ComponentValues[Name]>,
  ): void
  function createComponent<Props extends Properties>(
    name: string,
    component: Component<Props>,
  ): void
  function mount(rootElement: DOMElement, rootComponent: RootComponent): Cleanup
  function template(
    strings: TemplateStringsArray,
    ...args: Arg[]
  ): TemplateResult
  function createTemplateString(strings: TemplateStringsArray): string
  function createTemplateString(strings: string[]): string
}
