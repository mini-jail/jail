import { createComputed, createSignal } from "space/signal"
import html from "space/dom"

const code = `
import { createSignal } from "space/signal"
import html from "space/dom"

function Counter() {
  const counter = createSignal(0)
  const up = (ev) => counter(value => ++value)
  const down = (ev) => counter(value => --value)

  return html\`
    <button on:click=\${down}>-</button>
    <span>current value: \${counter}</span>
    <button on:click=\${up}>+</button>
  \`
}`.trim()

export default function Component() {
  const counter = createSignal(0)
  const show = createSignal(false)
  const up = (_event: Event) => counter((value) => ++value)
  const down = (_event: Event) => counter((value) => --value)
  const clicked = createComputed((currentValue) => {
    counter()
    return currentValue + 1
  }, -1)

  return html`
    ${counter}
    <article data-user="user has clicked ${clicked} times (counter equals ${counter})">
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button on:clickDelegate=${(_ev) => show((value) => !value)}>
          <Show when=${show} fallback="show code" children="hide code" />
        </button>
      </h4>
      <button on:clickDelegate=${down}>-</button>
      <span>current value: ${counter}</span>
      <button on:clickDelegate=${up}>+</button>
      <div>you have clicked ${clicked} times.</div>
      <div use:when=${() => clicked() >= 10}>
        ... why do you do this?????
      </div>
      <div use:when=${() => clicked() >= 20}>
        ... pls stop T_T</div>
      <div use:when=${() => clicked() >= 30}>
        ... enough :(
      </div>
      <div use:when=${() => clicked() >= 50}>
        ... it hurts @_@
      </div>
      <code use:when=${show}>
        ${code.split("\n").map((line) => html`<pre>${line}</pre>`)}
      </code>
    </article>
  `
}
