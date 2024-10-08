import { state } from "space/signal"
import html, { Show } from "space/dom"

const code = `
import { state } from "space/signal"
import html from "space/dom"

function SimpleCounter() {
  const counter = state(0)
  return html\`
    <button @click=\${() => counter.value--}>-</button>
    <span>current value: \${counter}</span>
    <button @click=\${() => counter.value++}>+</button>
  \`
}`.trim()

export default function Counter() {
  const counter = state(0)
  const show = state(false)
  return html`
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button @click=${() => show.value = !show.value}>
          <${Show} when=${show} fallback="show code">
            hide code
          <//>
        </button>
      </h4>
      <button @click=${() => counter.value--}>-</button>
      <span>current value: ${counter}</span>
      <button @click=${() => counter.value++}>+</button>
      <${Show} when=${show}>
        <code>
          ${code.split("\n").map((line) => html`<pre>${line}</pre>`)}
        </code>
      <//>
    </article>
  `
}
