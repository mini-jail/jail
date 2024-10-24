import { create } from "space/element"
import { state } from "space/signal"
import { Page } from "../components/mod.ts"

const code = /*js*/ `
function* SpaceCounter() {
  const counter = state(0)
  yield create("button", [["on:click", () => counter.value--]], "-")
  yield ["current value: ", counter]
  yield create("button", [["on:click", () => counter.value++]], "+")
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
  const counter = state(0)
  const show = state(false)
  return Page({ title: "counter example", description: "(...what else?)" }, [
    create("button", [["on:click", () => counter.value--]], "-"),
    create("span", null, "current value: ", counter),
    create("button", [["on:click", () => counter.value++]], "+"),
    create("div", null, [
      create("button", [["on:click", () => show.value = !show.value]], [
        () => show.value ? "hide code" : "show code",
      ]),
    ]),
    create("code", [["style:display", () => show.value ? "" : "none"]], [
      code.split("\n").map((line) => create("pre", null, line)),
    ]),
  ])
}
