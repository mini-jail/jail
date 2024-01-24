import { effect, onCleanup, root } from "space/signal"
import { createContext } from "../context.js"
import { reconcile, removeNodes, walkNode } from "../helpers.js"
import { forAliasIndexRE, forAliasRE } from "../regular-expressions.js"

/**
 * @param {import("../mod.js").DOMElement} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { expression, evaluate, context }) {
  const matches = (
    forAliasRE.exec(expression) ?? forAliasIndexRE.exec(expression)
  )?.groups
  if (matches === undefined) {
    throw new SyntaxError(
      `s-for: ${expression}!. alias in [expression] | (alias, index) in [expression]`,
    )
  }
  const before = new Text()
  elt.parentElement?.insertBefore(before, elt)
  let currentNodes
  onCleanup(() => {
    before.remove()
    removeNodes(currentNodes)
  })
  effect(() => {
    let nextNodes
    Array.from(evaluate(matches.e)).forEach((item, index) => {
      root(() => {
        const forContext = createContext(
          elt.content.cloneNode(true),
          context,
        )
        forContext[matches.a] = item
        if (matches.i) {
          forContext[matches.i] = index
        }
        walkNode(forContext.$root, forContext)
        if (nextNodes === undefined) {
          nextNodes = []
        }
        nextNodes.push(...Array.from(forContext.$root.childNodes))
      })
    })
    reconcile(elt.parentElement, before, currentNodes, nextNodes)
    currentNodes = nextNodes
  })
}
