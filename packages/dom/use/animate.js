/**
 * @param {import("space/dom").DOMElement} elt
 * @param {object} value
 */
export function animate(elt, value) {
  const { keyframes, ...options } = value
  elt.animate(keyframes, options)
}
