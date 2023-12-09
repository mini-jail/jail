import { onCleanup } from "jail/signal"
import { setAttribute } from "../helpers/mod.js"

/**
 * @param {space.Element} elt
 * @param {string} arg
 * @param {unknown} value
 */
export default function Attr(elt, arg, value) {
  if (setAttribute(elt, arg, value)) {
    onCleanup(() => setAttribute(elt, arg, null))
  }
}
