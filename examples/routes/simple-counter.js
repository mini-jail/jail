import { createRef } from "jail/signal"
import { template } from "jail/dom"

export default function Counter() {
  const counter = createRef(0)
  return template`
    <button d-on:click.delegate=${() => counter.value--}>-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate=${() => counter.value++}>+</button>
  `
}
