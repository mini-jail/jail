/**
 * @param {space.Element} elt
 * @param {space.AnimateValue} value
 */
export function animate(elt, value) {
  const { keyframes, ...options } = value
  elt.animate(keyframes, options)
}
