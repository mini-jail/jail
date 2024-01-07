export const textSymbol = Symbol("Text")

/**
 * @param {import("space/dom").DOMElement} elt
 * @param {unknown} value
 */
export function text(elt, value) {
  if (elt[textSymbol] === undefined) {
    elt[textSymbol] = new Text()
    elt.prepend(elt[textSymbol])
  }
  elt[textSymbol].data = value + ""
}
