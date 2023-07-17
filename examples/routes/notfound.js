import { template } from "jail/dom"
import { onMount, onUnmount } from "jail/signal"

export default () => {
  const originalColor = document.body.style.backgroundColor
  onMount(() => document.body.style.backgroundColor = "indianred")
  onUnmount(() => document.body.style.backgroundColor = originalColor)

  return template`
    <article>
      <h4>
        Page not found :(
        <sub>(ha-ha!)</sub>
      </h4>
      <p>There is no content for "${location}".</p>
    </article>
  `
}
