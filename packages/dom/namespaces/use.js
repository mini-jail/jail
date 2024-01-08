import directives from "../use.js"

/**
 * @template T
 * @param {import("space/dom").DOMElement} elt
 * @param {import("space/dom").Directive<T> | string} arg
 * @param {import("space/signal").Resolved<T>} value
 */
export function use(elt, arg, value) {
  if (typeof arg === "string") {
    return directives[arg](elt, value)
  }
  arg(elt, value)
}
