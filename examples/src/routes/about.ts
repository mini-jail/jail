import { create } from "space/element"
import { Page } from "../components/mod.ts"

export default function About() {
  return Page(
    { title: "about", description: "(signal? me? idk...)" },
    create("h5", null, "special thx to...actually me!"),
  )
}
