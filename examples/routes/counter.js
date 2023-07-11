import { createComputed, createSignal } from "jail/signal"
import { template } from "jail/dom"

const code = `
import { createSignal } from "jail/signal"
import { template } from "jail/dom"

function Counter() {
  const counter = createSignal(0)
  const up = () => counter(value => ++value)
  const down = () => counter(value => --value)

  return template\`
    <button d-on:click.delegate="\${down}">-</button>
    <span>current value: \${counter}</span>
    <button d-on:click.delegate="\${up}">+</button>
  \`
}`.trim()

export default () => {
  const counter = createSignal(0)
  const show = createSignal(false)
  const up = () => counter((value) => ++value)
  const down = () => counter((value) => --value)
  const clicked = createComputed((currentValue) => {
    counter()
    return currentValue + 1
  }, -1)

  return template`
    <article data-user="user has clicked ${clicked} times (counter equals ${counter})">
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button d-on:click.delegate="${() => show((value) => !value)}">
          ${() => show() ? "hide" : "show"} code
        </button>
      </h4>
      <button d-on:click.delegate="${down}">-</button>
      <span>current value: ${counter}</span>
      <button d-on:click.delegate="${up}">+</button>
      <div>> you have clicked ${clicked} times.</div>
      ${() => clicked() >= 10 && template`<div>> why do you do this?????</div>`}
      ${() => clicked() >= 20 && template`<div>> pls stop T_T</div>`}
      ${() => clicked() >= 30 && template`<div>> enough :(</div>`}
      ${() => clicked() >= 40 && template`<div>> it hurts @_@</div>`}
      <code d-show="${show}">
        ${code.split("\n").map((line) => template`<pre>${line}</pre>`)}
      </code>
    </article>
  `
}
