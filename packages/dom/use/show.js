/**
 * @param {space.DOMElement} elt
 * @param {space.BooleanLike} value
 */
export function show(elt, value) {
  elt.style.display = value + "" === "true" ? "" : "none"
}
