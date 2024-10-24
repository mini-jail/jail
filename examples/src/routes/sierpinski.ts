import { Page, SierpinskiTriangle } from "../components/mod.ts"

export default function Sierpinski() {
  return Page(
    { title: "sierpinski", description: "(i mean...why??)" },
    SierpinskiTriangle(),
  )
}
