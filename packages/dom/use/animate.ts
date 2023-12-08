import type { AnimateValue, DOMElement } from "../types.d.ts"

export default function Animate(elt: DOMElement, value: AnimateValue) {
  const { keyframes, ...options } = value
  elt.animate(keyframes, options)
}
