import { createSignal } from "jail/signal"
import html from "jail/dom"

export default function Component() {
  const counter = createSignal(0)
  const up = () => counter((value) => ++value)
  const down = () => counter((value) => --value)

  return html`
    <button d-on:click.delegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate=${up}>+</button>
  `
}
