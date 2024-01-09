/**
 * @param {import("space/dom").DOMElement} elt
 * @param {(elt: import("space/dom").DOMElement) => void} value
 */
export function ref(elt, value) {
  value(elt)
}
