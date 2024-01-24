/**
 * @typedef {Element & { [key: string | symbol]: any }} DOMElement
 */
/**
 * @typedef {{
 *   readonly $parent: Context | null
 *   readonly $root: Node
 *   readonly $directives: Directives
 *   readonly $refs: Record<string, Element>
 *   $event?: Event
 *   $elt?: DOMElement
 *   [key: string]: any
 * }} Context
 */
/**
 * @typedef {{
 *   readonly name: string
 *   readonly expression: string
 *   readonly arg: string | null
 *   readonly modifiers: Record<string, true | undefined> | null
 *   readonly context: Context
 *   evaluate(): any
 *   evaluate(expression: string): any
 * }} Binding
 */
/**
 * @typedef {(elt: DOMElement, binding: Binding) => void} Directive
 */
/**
 * @typedef {Record<string, Directive>} Directives
 */
/**
 * @typedef {{
 *   directive(name: string, directive: Directive): Application
 *   mount(parentNode: ParentNode): void | (() => void)
 * }} Application
 */
/**
 * @typedef {{
 *   [key: string]: any
 *   $directives?: Directives
 * }} Scope
 */
import { createApplication } from "./application.js"
import { createContext, evaluate } from "./context.js"
import { directive, directives } from "./directives.js"
import bindDirective from "./directives/bind.js"
import effectDirective from "./directives/effect.js"
import forDirective from "./directives/for.js"
import htmlDirective from "./directives/html.js"
import ifDirective from "./directives/if.js"
import modalDirective from "./directives/modal.js"
import onDirective from "./directives/on.js"
import partialDirective from "./directives/partial.js"
import refDirective from "./directives/ref.js"
import shadowDirective from "./directives/shadow.js"
import showDirective from "./directives/show.js"
import textDirective from "./directives/text.js"
directives.bind = bindDirective
directives.effect = effectDirective
directives.for = forDirective
directives.html = htmlDirective
directives.if = ifDirective
directives.modal = modalDirective
directives.on = onDirective
directives.partial = partialDirective
directives.ref = refDirective
directives.shadow = shadowDirective
directives.show = showDirective
directives.text = textDirective
export { createApplication, createContext, directive, evaluate }
