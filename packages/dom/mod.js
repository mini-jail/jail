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
import { children, html, mount, svg } from "./renderer.js"

import { component, components } from "./components.js"
import { Animate } from "./components/animate.js"
import { For } from "./components/for.js"
import { Portal } from "./components/portal.js"
import { getParams, path, Route, Router } from "./components/router.js"
import { Show } from "./components/show.js"
import { Match, Switch } from "./components/switch-match.js"
components.Animate = Animate
components.For = For
components.Portal = Portal
components.Router = Router
components.Route = Route
components.Show = Show
components.Switch = Switch
components.Match = Match

export {
  children,
  compile,
  component,
  components,
  createTree,
  getParams,
  getTree,
  html,
  mount,
  path,
  svg,
}
export default html
