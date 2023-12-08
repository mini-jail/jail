// deno-lint-ignore-file no-explicit-any
export interface DOMElement extends Element {
  [unknown: string | number | symbol]: any
}
export interface DOMNode extends ChildNode {
  [unknown: string | number | symbol]: any
}
export interface DOMEvent<Target extends DOMElement = DOMElement>
  extends Event {
  [unknown: string | number | symbol]: any
  currentTarget: Target & EventTarget
  target: Target & EventTarget
}
export interface DOMEventListener<
  Target extends DOMElement = DOMElement,
  Event extends DOMEvent = DOMEvent,
> {
  (this: Target, event: Event): void
}
export type Resolvable<Type> = Type | (() => Type)
export type ResolvedValue<Type> = Type extends ((...args: any[]) => any) ? Type
  : Type extends (() => any) ? ReturnType<Type>
  : Type
export type Slot =
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | DOMNode
  | SlotObject
  | Iterable<Slot>
  | DOMEventListener
  | (() => Slot)
export type RenderResult = DOMNode | DOMNode[] | undefined
export type ComponentResult =
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | DOMNode
  | Iterable<ComponentResult>
  | (() => ComponentResult)
export interface RootComponent {
  (): ComponentResult
}
export type BooleanLike = "true" | "false" | boolean
export type SlotObject = { [key: string | number | symbol]: any }
export type ComponentDataProps = Record<string, string | number | true>
export type ComponentData = {
  readonly slot: number
  readonly props: ComponentDataProps
  readonly selfClosing: boolean
}
export type Data = {
  [element: number]: number | ComponentData | AttributeData[]
}
export type Template = {
  readonly fragment: DocumentFragment
  readonly templateString: string
  readonly hash: string
  readonly data: Data
}
export type AttributeData = {
  readonly namespace: string | null
  readonly name: string | number
  readonly value: string | number | null
  readonly slots: number[] | null
  readonly isStatic: boolean
}
export interface NamespaceDirective<Type, Arg> {
  (elt: DOMElement, arg: Arg, value: Type): void
}
export interface Directive<Type> {
  (elt: DOMElement, value: ResolvedValue<Type>): void
}
export interface Component<Props extends Record<string, any>> {
  (props: Props): any
}
export type ComponentGroups = {
  nameSlot: string
  attributes: string
}
export type ComponentPropsGroups = {
  name: string
  slot1: string | undefined
  slot2: string | undefined
  slot3: string | undefined
  value1: string | undefined
  value2: string | undefined
  value3: string | undefined
}
export type AttributeGroups = {
  namespace: string | undefined
  name: string | undefined
  nameSlot: string | undefined
  slot1: string | undefined
  slot2: string | undefined
  slot3: string | undefined
  value1: string | undefined
  value2: string | undefined
  value3: string | undefined
}
export interface Namespaces {
  [namespace: string]: NamespaceDirective<any, any>
}
export interface AnimateValue extends KeyframeEffectOptions {
  keyframes: Keyframe[]
}
export interface ForProps {
  of: Resolvable<Record<string, any>>[]
  do: Component<Record<string, any>>
}
