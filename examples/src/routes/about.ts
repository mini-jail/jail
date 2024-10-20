import { createElement } from "space/element"
import { Page } from "../components/mod.ts"

export default function About() {
  return Page({ title: "about", description: "(signal? me? idk...)" })
    .add(
      createElement("h5")
        .add("special thx to...actually me!"),
    )
}
