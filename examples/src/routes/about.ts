import { createElement } from "space/element"
import { Title } from "../components/mod.ts"

export default function About() {
  return createElement("article")
    .add(Title("about", "(signal? me? idk...)"))
    .add(createElement("h5").add("special thx to...actually me!"))
}
