import { createElement } from "space/element"
import { SierpinskiTriangle, Title } from "../components/mod.ts"

export default function Sierpinski() {
  return createElement("article")
    .add(Title("sierpinski", "(i mean...why??)"))
    .add(SierpinskiTriangle)
}
