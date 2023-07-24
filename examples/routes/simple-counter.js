import { createSignal } from "jail/signal"
import { template } from "jail/dom"

export default function Counter() {
  const counter = createSignal(0)
  const up = () => counter((value) => ++value)
  const down = () => counter((value) => --value)

  return template`
    <button d-on:click.delegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate=${up}>+</button>
  `
}
