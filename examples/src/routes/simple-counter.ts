import { createSignal } from "jail/signal"
import html from "jail/dom"

export default function Component() {
  const counter = createSignal(0)
  const up = (_ev: Event) => counter((value) => ++value)
  const down = (_ev: Event) => counter((value) => --value)

  return html`
    <button on:clickDelegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button on:clickDelegate=${up}>+</button>
  `
}
