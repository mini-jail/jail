// deno-lint-ignore-file no-explicit-any
import type { Cleanup } from "jail/signal"

export interface Object {
  [prop: string | symbol | number]: any
}
export interface DOMElement extends HTMLElement {
  [prop: string | symbol | number]: any
}
export interface DOMNode extends Node {
  [prop: string | symbol | number]: any
}
export type DOMEventTarget<Target extends DOMElement> = Target & EventTarget
export interface DOMEvent<Target extends DOMElement = DOMElement>
  extends
  Event,
  UIEvent,
  InputEvent,
  KeyboardEvent,
  FocusEvent,
  MouseEvent,
  ClipboardEvent,
  DragEvent,
  FormDataEvent,
  SubmitEvent,
  TouchEvent,
  WheelEvent {
  target: DOMEventTarget<Target>
  currentTarget: DOMEventTarget<Target>
}
export interface DOMListener<Target extends DOMElement> {
  (this: DOMElement, event: DOMEvent<Target>): void
}
export type SlotPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | Object
  | Iterable<SlotPrimitive>
  | (() => SlotPrimitive)
export type SlotNode = DOMNode | Iterable<SlotNode> | (() => SlotNode)
export type Slot = SlotPrimitive | SlotNode | DOMListener<DOMElement>
export type RenderResult = DOMNode | DOMNode[] | undefined
export type Element = SlotNode | SlotPrimitive
export type RenderTypeMap = {
  attr: (elt: DOMElement, slots: Slot[]) => void
  slot: (elt: HTMLSlotElement, slots: Slot[]) => void
  comp: (elt: HTMLTemplateElement, slots: Slot[]) => void
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
export interface Directives {
  [name: string]: any
}
export interface Components {
  [name: string]: Component<Properties>
}
export interface Directive<Type = any> {
  (elt: DOMElement, binding: Binding<Type>): void
}
export interface Component<Props extends Properties> {
  (props: Props): any
}
export interface RootComponent {
  (): any
}
export interface Application {
  directives: Directives
  components: Components
}
export function createDirective<Type>(
  name: string,
  directive: Directive<Type>,
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
