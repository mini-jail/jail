import { effect, onCleanup } from "space/signal"
import { createContext } from "../context.js"
import { reconcile, removeNodes, walkNode } from "../helpers.js"

/**
 * @param {import("../mod.js").DOMElement} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { evaluate, context }) {
  const before = new Text(),
    isTemplate = elt instanceof HTMLTemplateElement
  elt.parentElement?.insertBefore(before, elt)
  let currentNodes, previousState
  onCleanup(() => {
    before.remove()
    removeNodes(currentNodes)
  })
  effect(() => {
    const isTrue = evaluate() + "" === "true"
    if (previousState === isTrue) {
      return
    }
    if (isTemplate) {
      let nextNodes
      if (isTrue) {
        const ifContext = createContext(
          elt.content.cloneNode(true),
          context,
        )
        walkNode(ifContext.$root, ifContext)
        nextNodes = Array.from(ifContext.$root.childNodes)
      }
      reconcile(elt.parentElement, before, currentNodes, nextNodes)
      currentNodes = nextNodes
    } else {
      if (isTrue) {
        before.parentElement?.insertBefore(elt, before)
      } else {
        elt.remove()
      }
    }
    previousState = isTrue
  })
}
