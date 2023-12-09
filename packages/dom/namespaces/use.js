import directives from "../use/mod.js"
/**
 * @template T
 * @param {space.DOMElement} elt
 * @param {space.Directive<T> | string} arg
 * @param {space.Resolved<T>} value
 */
export default function Use(elt, arg, value) {
  if (typeof arg === "string") {
    return directives[arg](elt, value)
  }
  arg(elt, value)
}
