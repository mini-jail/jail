import { create } from "space/element"
import { signal } from "space/signal"
import { Page } from "../components/mod.ts"

const code = /*js*/ `
function* SpaceCounter() {
  const counter = signal(0)
  yield create("button", { onClick: () => counter((value) => --value) }, "-")
  yield ["current value: ", counter]
  yield create("button", { onClick: () => counter((value) => ++value) }, "+")
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
    create("button", { onClick: () => counter((value) => --value) }, "-"),
    "current value: ",
    counter,
    create("button", { onClick: () => counter((value) => ++value) }, "+"),
    create("div", null, [
      create("button", { onClick: () => show(!show()) }, [
        () => show() ? "hide code" : "show code",
      ]),
    ]),
    create("code", { "style:display": () => show() ? "" : "none" }, [
      code.split("\n").map((line) => create("pre", null, line)),
    ]),
  ])
}
