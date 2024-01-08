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
import { mount, template } from "./renderer.js"

import { namespaces } from "./namespaces.js"
import { on } from "./namespaces/on.js"
import { prop } from "./namespaces/prop.js"
import { use } from "./namespaces/use.js"
import { attr } from "./namespaces/attr.js"
import { style } from "./namespaces/style.js"
import { classList } from "./namespaces/class-list.js"
namespaces.on = on
namespaces.prop = prop
namespaces.use = use
namespaces.attr = attr
namespaces.style = style
namespaces.classList = classList

import { directives } from "./use.js"
import { animate } from "./use/animate.js"
import { when } from "./use/when.js"
import { show } from "./use/show.js"
import { text } from "./use/text.js"
import { ref } from "./use/ref.js"
directives.animate = animate
directives.when = when
directives.show = show
directives.text = text
directives.ref = ref

import { components } from "./components.js"
import { For } from "./components/for.js"
import { getParams, path, Route, Router } from "./components/router.js"
import { Portal } from "./components/portal.js"
import { Show } from "./components/show.js"
import { Match, Switch } from "./components/switch.js"
import { ErrorBoundary } from "./components/error-boundary.js"
components.For = For
components.Router = Router
components.Route = Route
components.Portal = Portal
components.Show = Show
components.Switch = Switch
components.Match = Match
components.ErrorBoundary = ErrorBoundary

export default template

export { components, directives, getParams, mount, namespaces, path, template }
