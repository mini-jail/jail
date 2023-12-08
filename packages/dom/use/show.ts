import type { BooleanLike, DOMElement } from "../types.d.ts"

export default function Show(elt: DOMElement, value: BooleanLike) {
  elt.style.display = value + "" === "true" ? "" : "none"
}
