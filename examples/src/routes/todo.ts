import { signal } from "space/signal"
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

const deleteItem = (props: ToDoItem) => {
  list((items) => items.filter((item) => item.id !== props.id))
}
const toggleItem = (props: ToDoItem) => {
  list((items) => {
    const item = items.find((item) => item.id === props.id)
    if (item) {
      item.done = !item.done
    }
    return items
  })
}

function Item(props: ToDoItem) {
  return create("div", { class: "todo-item", id: "item_" + props.id }, [
    create("div", {
      class: "todo-item-text",
      onClick: () => toggleItem(props),
      children: props.text,
      "style:color": props.done ? "grey" : null,
      "style:fontStyle": props.done ? "italic" : null,
    }),
    create("div", {
      class: "todo-item-delete",
      style: { display: props.done ? null : "none" },
      onClick: () => deleteItem(props),
      children: "delete",
    }),
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
  const length = () => list().length
  const done = () => list().filter((item) => item.done).length

  return Page(
    {
      title: "todo",
      description: "(no-one ever have done that, i promise!)",
    },
    create("div", { class: "todo-app-container" }, [
      create("form", { onSubmit: [addItem, { prevent: true }] }, [
        create("input", {
          type: "text",
          placeholder: "...milk?",
          required: true,
          class: "todo_input",
          value: text,
          onInput: ({ target }) => text(target.value),
        }),
      ]),
      create("div", { class: "todo-items" }, List),
      create("label", null, "progress: ", done, "/", length),
      create("progress", { max: length, value: done }),
    ]),
  )
}
