import type { DOMElement } from "../types.d.ts"

export default function style(elt: DOMElement, arg: string, value: unknown) {
  elt.style[arg] = value || null
}
