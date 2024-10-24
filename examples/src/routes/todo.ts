import { computed, state } from "space/signal"
import { create } from "space/element"
import { Page } from "../components/mod.ts"

type ToDoItem = {
  id: number
  done: boolean
  text: string
}

let itemID = 0

const list = state<ToDoItem[]>([
  { id: itemID++, done: true, text: "eat cornflakes without soymilk" },
  { id: itemID++, done: false, text: "buy soymilk" },
])

function* List() {
  if (list.value.length === 0) {
    return yield "Nothing to do"
  }
  for (const item of list.value) {
    yield Item(item)
  }
}

function Item(props: ToDoItem) {
  const deleteItem = () => {
    list.value = list.value.filter((item) => item.id !== props.id)
  }
  const toggleItem = () => {
    const item = list.value.find((item) => item.id === props.id)
    if (item) {
      item.done = !item.done
      list.value = list.value.slice()
    }
  }
  return create("div", [["class", "todo-item"], ["id", "item_" + props.id]], [
    create("div", [
      ["class", "todo-item-text"],
      ["style:color", props.done ? "grey" : null],
      ["style:fontStyle", props.done ? "italic" : null],
      ["on:click", toggleItem],
    ], props.text),
    create("div", [
      ["class", "todo-item-delete"],
      ["style:display", props.done ? null : "none"],
      ["on:click", deleteItem],
    ], "delete"),
  ])
}

export default function ToDo() {
  const text = state("")
  const addItem = () => {
    list.value = list.value.concat({
      id: itemID++,
      done: false,
      text: text.value,
    })
    text.value = ""
  }
  const length = computed(() => list.value.length)
  const done = computed(() => list.value.filter((item) => item.done).length)

  return Page(
    {
      title: "todo",
      description: "(no-one ever have done that, i promise!)",
    },
    create("div", [["class", "todo-app-container"]], [
      create("form", [["on:submit", addItem, "prevent"]], [
        create("input", [
          ["type", "text"],
          ["placeholder", "...milk?"],
          ["required", true],
          ["class", "todo_input"],
          ["value", text],
          ["on:input", ({ target: { value } }) => text.value = value],
        ]),
      ]),
      create("div", [["class", "todo-items"]], List),
      create("label", null, "progress: ", done, "/", length),
      create("progress", [["max", length], ["value", done]]),
    ]),
  )
}
