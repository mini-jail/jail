import { effect, onCleanup } from "space/signal"
import { routerContext } from "space/element/router"
import { Page, Paragraph } from "../components/mod.ts"

export default function NotFound() {
  const { path } = routerContext.inject()
  effect(() => {
    const { backgroundColor } = document.body.style
    document.body.style.backgroundColor = "indianred"
    onCleanup(() => {
      document.body.style.backgroundColor = backgroundColor
    })
  })
  return Page({ title: "Page not found :(", description: "(ha-ha!)" })
    .add(Paragraph`There is no content for "${path}".`)
}
