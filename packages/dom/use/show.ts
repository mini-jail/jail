import type { DOMElement } from "../types.d.ts"

export default function Show(elt: DOMElement, value: string | boolean) {
  elt.style.display = value + "" === "true" ? "" : "none"
}
