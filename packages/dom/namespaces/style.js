/**
 * @param {space.Element} elt
 * @param {string} arg
 * @param {unknown} value
 */
export default function Style(elt, arg, value) {
  elt.style[arg] = value || null
}
