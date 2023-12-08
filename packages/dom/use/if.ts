import type { BooleanLike, DOMElement } from "../types.d.ts"

const ifSymbol = Symbol("If")

export default function If(elt: DOMElement, value: BooleanLike) {
  if (elt[ifSymbol] === undefined) {
    elt[ifSymbol] = new Text()
  }
  const isTrue = value + "" === "true",
    target = isTrue ? elt[ifSymbol] : elt
  target.replaceWith(isTrue ? elt : elt[ifSymbol])
}
