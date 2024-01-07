import { signal } from "space/signal"
import html from "space/dom"

const code = `
import { signal } from "space/signal"
import html from "space/dom"

function SimpleCounter() {
  const counter = signal(0)
  const up = () => counter.value++
  const down = () => counter.value--
  return html\`
    <button on:click=\${down}>-</button>
    <span>current value: \${counter}</span>
    <button on:click=\${up}>+</button>
  \`
}`.trim()

export default function Counter() {
  const counter = signal(0)
  const show = signal(false)
  const up = () => counter.value++
  const down = () => counter.value--

  return html`
    orphan child: ${counter} (will be still cleaned up)
    <article>
      <h4>
        counter example
        <sub>(...what else?)</sub>
        <button on:clickDelegate=${() => show.value = !show.value}>
          <Show when=${show} fallback="show code">
            hide code
          </Show>
        </button>
      </h4>
      <button on:clickDelegate=${down}>-</button>
      <span>current value: ${counter}</span>
      <button on:clickDelegate=${up}>+</button>
      <code use:when=${show}>
        ${code.split("\n").map((line) => html`<pre>${line}</pre>`)}
      </code>
    </article>
  `
}
