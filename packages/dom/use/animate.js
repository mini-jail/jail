/**
 * @param {space.DOMElement} elt
 * @param {space.AnimateValue} value
 */
export function Animate(elt, value) {
  const { keyframes, ...options } = value
  elt.animate(keyframes, options)
}
