import { createSignal } from "jail/signal"
import { mount, template } from "jail/dom"

const App = () => {
  const counter = createSignal(0)

  return template`
    <h1>Template</h1>
    <p d-on:click="${() => counter(counter() + 1)}" data-counter="${counter}">
      Hell${counter} W${counter}rld!
    </p>
  `
}

mount(document.body, App)
