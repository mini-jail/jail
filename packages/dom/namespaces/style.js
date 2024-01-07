/**
 * @param {import("space/dom").DOMElement} elt
 * @param {string} arg
 * @param {unknown} value
 */
export function style(elt, arg, value) {
  elt.style[arg] = value ?? null
}
