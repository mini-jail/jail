export const whenSymbol = Symbol("When")

/**
 * @param {import("space/dom").DOMElement} elt
 * @param {boolean | "true" | "false"} value
 */
export function when(elt, value) {
  if (elt[whenSymbol] === undefined) {
    elt[whenSymbol] = new Text()
  }
  const isTrue = value + "" === "true",
    target = isTrue ? elt[whenSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[whenSymbol])
}
