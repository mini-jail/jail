import html from "space/dom"
import { effect, onCleanup } from "space/signal"

export default function NotFound() {
  effect(() => {
    const { backgroundColor } = document.body.style
    document.body.style.backgroundColor = "indianred"
    onCleanup(() => {
      document.body.style.backgroundColor = backgroundColor
    })
  })
  return html`
    <article>
      <h4>
        Page not found :(
        <sub>(ha-ha!)</sub>
      </h4>
      <p>There is no content for "${location}".</p>
    </article>
  `
}
