export const textSymbol = Symbol("Text")

/**
 * @param {space.DOMElement} elt
 * @param {unknown} value
 */
export function Text(elt, value) {
  if (elt[textSymbol] === undefined) {
    elt[textSymbol] = new window.Text()
    elt.prepend(elt[textSymbol])
  }
  elt[textSymbol].data = value + ""
}
