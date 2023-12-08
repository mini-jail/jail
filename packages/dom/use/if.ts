import { DOMElement } from "../types.d.ts"

const ifSymbol = Symbol()

export default function If(elt: DOMElement, value: string | boolean) {
  if (elt[ifSymbol] === undefined) {
    elt[ifSymbol] = new Text()
  }
  const isTrue = value + "" === "true",
    target = isTrue ? elt[ifSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[ifSymbol])
}
