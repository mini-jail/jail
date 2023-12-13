export const whenSymbol = Symbol("When")

/**
 * @param {space.Element} elt
 * @param {space.BooleanLike} value
 */
export function when(elt, value) {
  if (elt[whenSymbol] === undefined) {
    elt[whenSymbol] = new Text()
  }
  const isTrue = value + "" === "true",
    target = isTrue ? elt[whenSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[whenSymbol])
}
