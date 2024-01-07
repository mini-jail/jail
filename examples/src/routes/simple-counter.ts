import { signal } from "space/signal"
import html from "space/dom"

export default function SimpleCounter() {
  const counter = signal(0)
  const up = () => counter.value++
  const down = () => counter.value--
  return html`
    <button on:clickDelegate=${down}>-</button>
    <span>current value: ${counter}</span>
    <button on:clickDelegate=${up}>+</button>
  `
}
