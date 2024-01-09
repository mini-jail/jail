/**
 * @param {import("space/dom").DOMElement} elt
 * @param {string} arg
 * @param {boolean | "true" | "false"} value
 */
export function classList(elt, arg, value) {
  if (value + "" === "true") {
    elt.classList.add(arg)
  } else {
    elt.classList.remove(arg)
  }
}
