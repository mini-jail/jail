import { createSignal } from "jail/signal"
import html, { DOMEvent } from "jail/dom"
import { createComputed } from "jail/signal"

type ToDoItem = {
  id: number
  done: boolean
  text: string
}

const list = createSignal<ToDoItem[]>([
  { id: 0, done: true, text: "eat cornflakes without soymilk" },
  { id: 1, done: false, text: "buy soymilk" },
])

const Item = (props: ToDoItem) => {
  const deleteItem = (_event: Event) =>
    list(list().filter((item) => item.id !== props.id))
  const toggleItem = (_event: Event) =>
    list((items) => (props.done = !props.done, items))

  return html`
    <div class="todo-item" id="item_${props.id}">
      <div 
        class="todo-item-text" d-on:click.delegate=${toggleItem}
        style="${props.done ? "color: grey; font-style: italic;" : null}"
      >
        ${props.text}
      </div>
      <div d-show=${props.done} class="todo-item-delete" d-on:click.delegate=${deleteItem}>
        delete
      </div>
    </div>
  `
}

export default function Component() {
  const textValue = createSignal("")
  const addItem = (_event: Event) => {
    list(list().concat({ id: Date.now(), done: false, text: textValue() }))
    textValue("")
  }
  const onInput = (ev: DOMEvent<HTMLInputElement>) => textValue(ev.target.value)
  const length = createComputed(() => list().length, 0)
  const done = createComputed(() => {
    return list().filter((item) => item.done).length
  }, 0)

  return html`
    <article class="todo-app">
      <h4>
        todo
        <sub>(no-one ever have done that, i promise!)</sub>
      </h4>
      <div class="todo-app-container">
        <form d-on:submit.prevent=${addItem}>
          <input 
            type="text" placeholder="...milk?"
            required class="todo_input" value=${textValue}
            d-on:input=${onInput}
          />
        </form>
        <div class="todo-items">
          ${() => list().map((item) => Item(item))}
        </div>
        <label>progress: ${done}/${length}</label>
        <progress max=${length} value=${done}></progress>
      </div>
    </article>
  `
}
