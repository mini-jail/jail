/**
 * @typedef {{ [key: string]: any, children?: any }} Props
 */
/**
 * @typedef {{
 *   type: string | number,
 *   props: Record<string, string | number | boolean> | null,
 *   children: Child | Child[] | null
 * }} Tree
 */
/**
 * @typedef {string | number | Tree} Child
 */
/**
 * @template Type
 * @typedef {{
 *   name: string
 *   arg: string | null
 *   modifiers: { [field: string]: true | undefined } | null
 *   value: Type
 * }} Binding
 */
/**
 * @template Type
 * @typedef {(elt: HTMLElement, binding: Binding<Type>) => void} Directive
 */
/**
 * @template {Props} Type
 * @typedef {(props: Type) => any} Component
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
import { compile, createTree, getTree } from "./compiler.js"
import { html, mount, svg } from "./renderer.js"

import { directive, directives } from "./directives.js"
import textDirective from "./directives/text.js"
import styleDirective from "./directives/style.js"
import ifDirective from "./directives/if.js"
import showDirective from "./directives/show.js"
import animateDirective from "./directives/animate.js"
directives.text = textDirective
directives.style = styleDirective
directives.if = ifDirective
directives.show = showDirective
directives.animate = animateDirective

import { component, components } from "./components.js"
import { Animate } from "./components/animate.js"
import { For } from "./components/for.js"
import { Portal } from "./components/portal.js"
import { getParams, path, Route, Router } from "./components/router.js"
import { Show } from "./components/show.js"
components.Animate = Animate
components.For = For
components.Portal = Portal
components.Router = Router
components.Route = Route
components.Show = Show

export {
  compile,
  component,
  components,
  createTree,
  directive,
  directives,
  getParams,
  getTree,
  html,
  mount,
  path,
  svg,
}
export default html
