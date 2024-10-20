import { computed, state } from "space/signal"
import { createElement } from "space/element"
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
  const deleteItem = (_ev: Event) => {
    list.value = list.value.filter((item) => item.id !== props.id)
  }
  const toggleItem = (_ev: Event) => {
    const item = list.value.find((item) => item.id === props.id)
    if (item) {
      item.done = !item.done
      list.value = list.value.slice()
    }
  }
  return createElement("div")
    .attribute("class", "todo-item")
    .attribute("id", "item_" + props.id)
    .add(
      createElement("div")
        .attribute("class", "todo-item-text")
        .styles({
          color: props.done ? "grey" : null,
          fontStyle: props.done ? "italic" : null,
        })
        .on("click", toggleItem)
        .add(props.text),
      createElement("div")
        .attribute("class", "todo-item-delete")
        .style("display", props.done ? null : "none")
        .on("click", deleteItem)
        .add("delete"),
    )
}

export default function ToDo() {
  const text = state("")
  const addItem = (ev) => {
    ev.preventDefault()
    list.value = list.value.concat({
      id: itemID++,
      done: false,
      text: text.value,
    })
    text.value = ""
  }
  const onInput = (ev) => text.value = ev.target.value
  const length = computed(() => list.value.length)
  const done = computed(() => list.value.filter((item) => item.done).length)
  return Page({
    title: "todo",
    description: "(no-one ever have done that, i promise!)",
  }).add(
    createElement("div")
      .attribute("class", "todo-app-container")
      .add(
        createElement("form")
          .on("submit", addItem)
          .add(
            createElement("input")
              .property("type", "text")
              .property("placeholder", "...milk?")
              .property("required", true)
              .property("className", "todo_input")
              .property("value", text)
              .on("input", onInput),
          ),
        createElement("div")
          .attribute("class", "todo-items")
          .add(List),
        createElement("label")
          .add("progress: ", done, "/", length),
        createElement("progress")
          .property("max", length)
          .property("value", done),
      ),
  )
}
