import { effect, onCleanup } from "space/signal"
import { routerContext } from "space/element/router"
import { createElement } from "space/element"
import { Paragraph, Title } from "../components/mod.ts"

export default function NotFound() {
  const { path } = routerContext.inject()
  effect(() => {
    const { backgroundColor } = document.body.style
    document.body.style.backgroundColor = "indianred"
    onCleanup(() => {
      document.body.style.backgroundColor = backgroundColor
    })
  })
  return createElement("article")
    .add(
      Title("Page not found :(", "(ha-ha!)"),
      Paragraph`There is no content for "${path}".`,
    )
}
