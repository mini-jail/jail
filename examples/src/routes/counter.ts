import { signal } from "space/signal"
import html from "space/dom"

const code = `
import { signal } from "space/signal"
import html from "space/dom"

function SimpleCounter() {
  const counter = signal(0)
  return html\`
    <button onClick=\${() => counter.value--}>-</button>
    <span>current value: \${counter}</span>
    <button onClick=\${() => counter.value++}>+</button>
  \`
}`.trim()

export default function Counter() {
  const counter = signal(0)
  const show = signal(false)

  return html`
    (${counter} this one's at the root)
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button onClick=${() => show.value = !show.value}>
          <Show when=${show} fallback="show code">
            hide code
          </Show>
        </button>
      </h4>
      <button onClick=${() => counter.value--}>-</button>
      <span>current value: ${counter}</span>
      <button onClick=${() => counter.value++}>+</button>
      <Show when=${show}>
        <code>
          ${code.split("\n").map((line) => html`<pre>${line}</pre>`)}
        </code>
      </Show>
    </article>
  `
}
