import { createSignal } from "space/signal"
import html from "space/dom"

export default function SimpleCounter() {
  const counter = createSignal(0)
  return html`
    <button @click=${() => counter.value--}>-</button>
    <span>current value: ${counter}</span>
    <button @click=${() => counter.value++}>+</button>
  `
}
