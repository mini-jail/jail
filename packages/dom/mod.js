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
import { text } from "./directives/text.js"
import { style } from "./directives/style.js"
import { when } from "./directives/when.js"
import { show } from "./directives/show.js"
import { animate } from "./directives/animate.js"
directives.text = text
directives.style = style
directives.when = when
directives.show = show
directives.animate = animate

import { component, components } from "./components.js"
import { For } from "./components/for.js"
import { Portal } from "./components/portal.js"
import { getParams, path, Route, Router } from "./components/router.js"
import { Show } from "./components/show.js"
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
