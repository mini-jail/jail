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
import { Animate } from "./components/animate.js"
import { For } from "./components/for.js"
import { Portal } from "./components/portal.js"
import { getParams, path, Route, Router } from "./components/router.js"
import { Show } from "./components/show.js"

export {
  Animate,
  compile,
  createTree,
  For,
  getParams,
  getTree,
  html,
  mount,
  path,
  Portal,
  Route,
  Router,
  Show,
  svg,
}
export default html
