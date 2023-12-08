import { DOMElement } from "../types.d.ts"

const textSymbol = Symbol("Text")
export default function Text(elt: DOMElement, value: unknown) {
  if (elt[textSymbol] === undefined) {
    elt[textSymbol] = new window.Text()
    elt.prepend(elt[textSymbol])
  }
  elt[textSymbol].data = value + ""
}
