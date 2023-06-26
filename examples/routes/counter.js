import { createComputed, createRef } from "jail/signal"
import { template } from "jail/dom"

const code = `
import { createRef } from "jail/signal"
import { template } from "jail/dom"

function Counter() {
  const counter = createRef(0)

  return template\`
    <button d-on:click.delegate=\${() => counter.value--}>-</button>
    <span>current value: \${counter}</span>
    <button d-on:click.delegate=\${() => counter.value++}>+</button>
  \`
}`.trim()

export default () => {
  const counter = createRef(0)
  const show = createRef(false)
  const clicked = createComputed((currentValue) => {
    counter.value
    return currentValue + 1
  }, -1)

  return template`
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button d-on:click.delegate=${() => show.value = !show.value}>
          ${() => show.value ? "hide" : "show"} code
        </button>
      </h4>
      <button d-on:click.delegate=${() => counter.value--}>-</button>
      <span>current value: ${counter}</span>
      <button d-on:click.delegate=${() => counter.value++}>+</button>
      <div>> you have clicked ${clicked} times.</div>
      ${() => clicked() > 10 && template`<div>> why do you do this?????</div>`}
      ${() => clicked() > 20 && template`<div>> pls stop T_T</div>`}
      ${() => clicked() > 30 && template`<div>> enough :(</div>`}
      ${() => clicked() > 40 && template`<div>> it hurts @_@</div>`}
      <code d-show=${show}>
        ${code.split("\n").map((line) => template`<pre>${line}</pre>`)}
      </code>
    </article>
  `
}
