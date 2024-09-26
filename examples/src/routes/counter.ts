import { createSignal } from "space/signal"
import html, { Show } from "space/dom"

const code = `
import { createSignal } from "space/signal"
import html from "space/dom"

function SimpleCounter() {
  const counter = createSignal(0)
  return html\`
    <button onClick=\${() => counter.value--}>-</button>
    <span>current value: \${counter}</span>
    <button onClick=\${() => counter.value++}>+</button>
  \`
}`.trim()

export default function Counter() {
  const counter = createSignal(0), show = createSignal(false)
  return html`
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button onClick=${() => show.value = !show.value}>
          <${Show} when=${show} fallback="show code">
            hide code
          <//>
        </button>
      </h4>
      <button onClick=${() => counter.value--}>-</button>
      <span>current value: ${counter}</span>
      <button onClick=${() => counter.value++}>+</button>
      <${Show} when=${show}>
        <code>
          ${code.split("\n").map((line) => html`<pre>${line}</pre>`)}
        </code>
      <//>
    </article>
  `
}
