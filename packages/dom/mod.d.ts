import type { Cleanup } from "jail/signal"

declare global {
  interface InjectionValueMap {
    [AppInjectionKey]?: App
  }
  interface DirectiveValueMap {
    on: DOMListener<DOMElement>
    ref: (elt: DOMElement) => void
    show: boolean
    if: boolean
    html: string
    text: string
    style: string
    bind: any
    [name: string]: any
  }
  interface ComponentPropertyMap {
    [name: string]: Properties
  }
}

export interface Object {
  [prop: string | symbol | number]: any
}
export type DOMElement = (HTMLElement | SVGElement) & Object
export type DOMNode = DOMElement | (Node & Object)
export type DOMEventTarget<Target> = Target & EventTarget
export interface DOMEvent<Target> extends Event {
  target: DOMEventTarget<Target>
  currentTarget: DOMEventTarget<Target>
}
export interface DOMListener<Target> {
  (this: DOMElement, event: DOMEvent<Target>): void
}
export type SlotPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | Object
  | SlotPrimitive[]
  | (() => SlotPrimitive)
export type SlotNode = DOMNode | DOMNode[] | (() => SlotNode)
export type Slot = SlotPrimitive | SlotNode | DOMListener<DOMElement>
export type RenderResult = DOMNode | DOMNode[] | undefined
export type RenderTypeMap = {
  attr(elt: DOMElement, slots: Slot[]): void
  slot(elt: HTMLSlotElement, slots: Slot[]): void
  comp(elt: HTMLTemplateElement, slots: Slot[]): void
}
export interface Modifiers {
  readonly [key: string]: boolean
}
export interface Binding<Type = any> {
  readonly value: Type
  readonly rawValue: (() => Type) | Type
  readonly arg: string | null
  readonly modifiers: Modifiers | null
}
export interface Properties {
  children?: RenderResult | any
  [property: string]: any
}
export interface Directive<Type = any> {
  (elt: DOMElement, binding: Binding<Type>): void
}
export interface Component<Props extends Properties = Properties> {
  (props: Props): any
}
export interface RootComponent {
  (): any
}
export interface App {
  directives: DirectiveValueMap
  components: ComponentPropertyMap
}
export const AppInjectionKey: unique symbol
export function createDirective<Name extends keyof DirectiveValueMap>(
  name: Name,
  directive: Directive<DirectiveValueMap[Name]>,
): void
export function createDirective<Type>(
  name: string,
  directive: Directive<Type>,
): void
export function createComponent<Name extends keyof ComponentPropertyMap>(
  name: Name,
  component: Component<ComponentPropertyMap[Name]>,
): void
export function createComponent<Props extends Properties>(
  name: string,
  component: Component<Props>,
): void
export function mount(
  rootElement: DOMElement,
  rootComponent: RootComponent,
): Cleanup
export function template(
  strings: TemplateStringsArray,
  ...slots: Slot[]
): RenderResult
export function createTemplateString(strings: TemplateStringsArray): string
export function createTemplateString(strings: string[]): string
