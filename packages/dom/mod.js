/**
 * @typedef {Node & { [key: string]: any }} DOMNode
 */
/**
 * @typedef {Element & { [key: string | symbol | number]: any }} DOMElement
 */
/**
 * @template Type
 * @typedef {(elt: DOMElement, value: import("space/signal").Resolved<Type>) => void} Directive
 */
/**
 * @template Arg, Type
 * @typedef {(elt: DOMElement, arg: Arg, value: Type) => void} Namespace
 */
/**
 * @template {object} Type
 * @typedef {Event & {
 *   currentTarget: Type & EventTarget
 *   target: Type & EventTarget
 * }} DOMEvent
 */
/**
 * @template {object} Type
 * @typedef {(this: Type, event: DOMEvent<Type>) => void} DOMEventListener
 */
/**
 * @template {object} Props
 * @typedef {(props: Props) => any} Component
 */
/**
 * @typedef {Record<string, string | number | true>} ComponentDataProps
 */
/**
 * @typedef {{
 *   readonly name: string | number
 *   readonly props: ComponentDataProps
 *   readonly selfClosing: boolean
 * }} ComponentData
 */
/**
 * @typedef {{
 *   [element: number | string]: TemplateValue
 * }} TemplateData
 */
/**
 * @typedef {number | ComponentData | AttributeData[]} TemplateValue
 */
/**
 * @typedef {{
 *   readonly fragment: DocumentFragment
 *   readonly hash: string
 *   readonly data: TemplateData
 * }} Template
 */
/**
 * @typedef {DOMNode | DOMNode[] | undefined} DOMResult
 */
/**
 * @typedef {{
 *   readonly namespace: string | number | null
 *   readonly name: string | number
 *   readonly value: string | number | true
 *   readonly slots: number[] | null
 * }} AttributeData
 */
/**
 * @typedef {string | number | boolean | null | undefined | void | DOMElement | DOMEventListener<DOMElement> | Record<PropertyKey, any> | Iterable<any>} Slot
 */
/**
 * @typedef {{
 *   name: string | undefined
 *   slot: string | undefined
 *   attributes: string
 * }} ComponentGroups
 */
/**
 * @typedef {{
 *   name: string
 *   slot1: string | undefined
 *   slot2: string | undefined
 *   slot3: string | undefined
 *   value1: string | undefined
 *   value2: string | undefined
 *   value3: string | undefined
 * }} ComponentPropsGroups
 */
/**
 * @typedef {{
 *   name: string
 *   nameSlot: string | undefined
 *   namespace: string | undefined
 *   namespaceSlot: string | undefined
 *   slot1: string | undefined
 *   slot2: string | undefined
 *   slot3: string | undefined
 *   value1: string | undefined
 *   value2: string | undefined
 *   value3: string | undefined
 * }} AttributeGroups
 */
/**
 * @typedef {DOMElement & {
 *   content: DocumentFragment
 * }} TemplateElement
 */
import { mount, template } from "./renderer/mod.js"
export { mount, template }
export {
  attr,
  classList,
  namespaces,
  on,
  prop,
  style,
  use,
} from "./namespaces/mod.js"
export { animate, directives, ref, show, text, when } from "./use/mod.js"
export {
  components,
  ErrorBoundary,
  For,
  getParams,
  Match,
  path,
  Portal,
  Route,
  Router,
  Show,
  Switch,
} from "./components/mod.js"
export default template
