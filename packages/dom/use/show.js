/**
 * @param {space.DOMElement} elt
 * @param {space.BooleanLike} value
 */
export function Show(elt, value) {
  elt.style.display = value + "" === "true" ? "" : "none"
}
