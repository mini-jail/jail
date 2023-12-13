export const textSymbol = Symbol("Text")

/**
 * @param {space.Element} elt
 * @param {unknown} value
 */
export function text(elt, value) {
  if (elt[textSymbol] === undefined) {
    elt[textSymbol] = new Text()
    elt.prepend(elt[textSymbol])
  }
  elt[textSymbol].data = value + ""
}
