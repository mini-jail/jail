import { create } from "space/element"
import { signal } from "space/signal"
import { Page } from "../components/mod.ts"

const code = /*js*/ `
function* SpaceCounter() {
  const counter = signal(0)
  yield create("button", [
    ["on:click", () => counter(counter() - 1)]
  ], "-")
  yield ["current value: ", counter]
  yield create("button", [
    ["on:click", () => counter(counter() + 1)]
  ], "+")
}

function ReactCounter() {
  const [counter, setCounter] = useState(0)
  return (
    <>
      <button onClick={() => setCounter(counter - 1)}>-</button>
      current value: {counter}
      <button onClick={() => setCounter(counter + 1)}>+</button>
    </>
  )
}
`.trim()

export default function Counter() {
  const counter = signal(0)
  const show = signal(false)
  return Page({ title: "counter example", description: "(...what else?)" }, [
    create("button", [["on:click", () => counter((value) => --value)]], "-"),
    create("span", null, "current value: ", counter),
    create("button", [["on:click", () => counter((value) => ++value)]], "+"),
    create("div", null, [
      create("button", [["on:click", () => show(!show())]], [
        () => show() ? "hide code" : "show code",
      ]),
    ]),
    create("code", [["style:display", () => show() ? "" : "none"]], [
      code.split("\n").map((line) => create("pre", null, line)),
    ]),
  ])
}
