import { createElement } from "space/element"
import { state } from "space/signal"
import { Title } from "../components/mod.ts"

const code = /*js*/ `
function* SpaceCounter() {
  const counter = state(0)
  yield createElement("button").add("-").on("click", () => counter.value--)
  yield createElement("span").add("current value: ", counter)
  yield createElement("button").add("+").on("click", () => counter.value++)
}

function ReactCounter() {
  const [state, setState] = useState(0)
  return (
    <>
      <button onClick={() => setState(state - 1)}>-</button>
      <span>current value: {state}</span>
      <button onClick={() => setState(state + 1)}>+</button>
    </>
  )
}
`.trim()

export default function Counter() {
  const counter = state(0)
  const show = state(false)
  return createElement("article")
    .add(
      Title("counter example", "(...what else?)")
        .add(
          createElement("button")
            .add(() => show.value ? "hide code" : "show code")
            .on("click", () => show.value = !show.value),
        ),
      createElement("button")
        .add("-")
        .on("click", () => counter.value--),
      createElement("span")
        .add("current value: ", counter),
      createElement("button")
        .add("+")
        .on("click", () => counter.value++),
      createElement("code")
        .style("display", () => show.value ? "" : "none")
        .add(
          code.split("\n").map((line) => createElement("pre").add(line)),
        ),
    )
}
