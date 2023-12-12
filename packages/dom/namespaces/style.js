import { onCleanup } from "space/signal"

/**
 * @param {space.DOMElement} elt
 * @param {string} arg
 * @param {unknown} value
 */
export function style(elt, arg, value) {
  const previousValue = elt.style[arg]
  elt.style[arg] = value || null
  onCleanup(() => elt.style[arg] = previousValue)
}
