import { onCleanup } from "space/signal"
import { setAttribute } from "../helpers/mod.js"

/**
 * @param {space.DOMElement} elt
 * @param {string} arg
 * @param {unknown} value
 */
export function attr(elt, arg, value) {
  if (setAttribute(elt, arg, value)) {
    onCleanup(() => setAttribute(elt, arg, null))
  }
}
