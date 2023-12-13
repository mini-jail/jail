import { setAttribute } from "../helpers/mod.js"

/**
 * @param {space.DOMElement} elt
 * @param {string} arg
 * @param {unknown} value
 */
export function attr(elt, arg, value) {
  setAttribute(elt, arg, value)
}
