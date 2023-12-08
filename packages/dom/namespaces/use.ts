import type { Directive, DOMElement } from "../types.d.ts"

export default function use(
  elt: DOMElement,
  arg: Directive<unknown>,
  value: unknown,
) {
  arg(elt, value)
}
