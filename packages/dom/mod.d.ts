import type { AppInjectionKey } from "jail/dom"
import type { Cleanup } from "jail/signal"

declare module "jail/signal" {
  interface Injections {
    [AppInjectionKey]?: App
  }
}

declare module "jail/dom" {
  type DOMNode = Node & AnyObject
  type DOMElement = (HTMLElement | SVGElement) & AnyObject
  type DOMEvent = Event & { currentTarget: EventTarget & DOMElement }
  type DOMListener = (this: DOMElement, event: DOMEvent) => void
  type NodeSlot =
    | string
    | number
    | DOMNode
    | DOMElement
    | boolean
    | null
    | undefined
  type AttrSlot =
    | NodeSlot
    | NodeSlot[]
    | (() => NodeSlot)
    | DOMListener
    | AnyObject
  type Slot =
    | NodeSlot
    | AttrSlot
    | (NodeSlot | AttrSlot)[]
    | (() => NodeSlot | AttrSlot)
  type TemplateResult = DOMNode | DOMNode[] | undefined
  interface RenderTypeMap {
    attr(elt: DOMElement, slots: Slot[]): void
    slot(elt: HTMLSlotElement, slots: Slot[]): void
    comp(elt: HTMLTemplateElement, slots: Slot[]): void
  }
  type AnyObject = {
    [key: string]: any
  }
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
  interface Directives {
    [name: string]: any
  }
  interface Components {
    [name: `${Uppercase<string>}${string}`]: Properties
  }
  interface App {
    directives: Directives
    components: Components
  }
  const AppInjectionKey: unique symbol
  function createDirective<Name extends keyof Directives>(
    name: Name,
    directive: Directive<Directives[Name]>,
  ): void
  function createDirective<Type>(
    name: string,
    directive: Directive<Type>,
  ): void
  function createComponent<Name extends keyof Components>(
    name: Name,
    component: Component<Components[Name]>,
  ): void
  function createComponent<Props extends Properties>(
    name: string,
    component: Component<Props>,
  ): void
  function mount(rootElement: DOMElement, rootComponent: RootComponent): Cleanup
  function template(
    strings: TemplateStringsArray,
    ...slots: Slot[]
  ): TemplateResult
  function createTemplateString(strings: TemplateStringsArray): string
  function createTemplateString(strings: string[]): string
}
