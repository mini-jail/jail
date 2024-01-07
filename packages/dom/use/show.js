/**
 * @param {import("space/dom").DOMElement} elt
 * @param {boolean | "true" | "false"} value
 */
export function show(elt, value) {
  elt.style.display = value + "" === "true" ? "" : "none"
}
