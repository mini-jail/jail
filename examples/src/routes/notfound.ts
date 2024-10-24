import { effect, onCleanup } from "space/signal"
import { Page, Paragraph } from "../components/mod.ts"

export default function NotFound() {
  effect(() => {
    const { backgroundColor } = document.body.style
    document.body.style.backgroundColor = "indianred"
    onCleanup(() => {
      document.body.style.backgroundColor = backgroundColor
    })
  })
  return Page(
    { title: "Page not found :(", description: "(ha-ha!)" },
    Paragraph`There is no content for "${location.pathname}".`,
  )
}
