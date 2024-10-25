import { computed, signal } from "space/signal"
import { create } from "space/element"
import { Page } from "../components/mod.ts"

type ToDoItem = {
  id: number
  done: boolean
  text: string
}

let itemID = 0

const list = signal<ToDoItem[]>([
  { id: itemID++, done: true, text: "eat cornflakes without soymilk" },
  { id: itemID++, done: false, text: "buy soymilk" },
])

function List() {
  if (list().length === 0) {
    return "Nothing to do"
  }
  return list().map(Item)
}

function Item(props: ToDoItem) {
  const deleteItem = () => {
    list((items) => items.filter((item) => item.id !== props.id))
  }
  const toggleItem = () => {
    list((items) => {
      const item = items.find((item) => item.id === props.id)
      if (item) {
        item.done = !item.done
      }
      return items
    })
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
  const text = signal("")
  const addItem = () => {
    list((items) =>
      items.concat({
        id: itemID++,
        done: false,
        text: text(),
      })
    )
    text("")
  }
  const length = computed(() => list().length)
  const done = computed(() => list().filter((item) => item.done).length)

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
          ["on:input", ({ target }) => text(target.value)],
        ]),
      ]),
      create("div", [["class", "todo-items"]], List),
      create("label", null, "progress: ", done, "/", length),
      create("progress", [["max", length], ["value", done]]),
    ]),
  )
}
