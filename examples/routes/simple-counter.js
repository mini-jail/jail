import { createRef } from "signal"
import { template } from "signal/dom"

export default function Counter() {
  const counter = createRef(0)
  return template`
    <button d-on:click.delegate=${() => counter.value--}>-</button>
    <span>current value: ${counter}</span>
    <button d-on:click.delegate=${() => counter.value++}>+</button>
  `
}
