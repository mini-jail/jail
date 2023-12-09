export const ifSymbol = Symbol("If")

/**
 * @param {space.Element} elt
 * @param {space.BooleanLike} value
 */
export function If(elt, value) {
  if (elt[ifSymbol] === undefined) {
    elt[ifSymbol] = new Text()
  }
  const isTrue = value + "" === "true",
    target = isTrue ? elt[ifSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[ifSymbol])
}
