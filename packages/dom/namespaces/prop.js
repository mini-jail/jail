import { onCleanup } from "space/signal"

/**
 * @param {space.DOMElement} elt
 * @param {string | number | symbol} arg
 * @param {unknown} value
 */
export default function Prop(elt, arg, value) {
  const previousValue = elt[arg]
  elt[arg] = value
  onCleanup(() => elt[arg] = previousValue)
}
