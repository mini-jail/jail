import html from "space/dom"
import { cleanup, effect } from "space/signal"

export default function NotFound() {
  const { backgroundColor } = document.body.style
  effect(() => {
    document.body.style.backgroundColor = "indianred"
  })
  cleanup(() => document.body.style.backgroundColor = backgroundColor)

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
