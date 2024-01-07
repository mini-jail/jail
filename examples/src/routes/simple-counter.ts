import { signal } from "space/signal"
import html from "space/dom"

export default function SimpleCounter() {
  const counter = signal(0)
  const up = (_ev: Event) => counter.value++
  const down = (_ev: Event) => counter.value--
  return html`
    <button on:clickDelegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button on:clickDelegate=${up}>+</button>
  `
}
