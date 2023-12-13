import { createComputed, createSignal } from "space/signal"
import html from "space/dom"

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
  const deleteItem = (_ev: Event) =>
    list(list().filter((item) => item.id !== props.id))
  const toggleItem = (_ev: Event) =>
    list((items) => (props.done = !props.done, items))
  return html`
    <div class="todo-item" id="item_${props.id}">
      <div 
        class="todo-item-text" on:clickDelegate=${toggleItem}
        style="${props.done ? "color: grey; font-style: italic;" : null}"
      >
        ${props.text}
      </div>
      <div use:show=${props.done} class="todo-item-delete" on:clickDelegate=${deleteItem}>
        delete
      </div>
    </div>
  `
}

export default function ToDo() {
  const textValue = createSignal("")
  const addItem = (_event: Event) => {
    list(list().concat({ id: Date.now(), done: false, text: textValue() }))
    textValue("")
  }
  const onInput = (ev: space.Event<HTMLInputElement>) =>
    textValue(ev.target.value)
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
        <form on:submitPreventDelegate=${addItem}>
          <input 
            type="text" placeholder="...milk?"
            required class="todo_input" value=${textValue}
            on:inputDelegate=${onInput}
          />
        </form>
        <div class="todo-items">
          <For each=${list} do=${Item} />
        </div>
        <label>progress: ${done}/${length}</label>
        <progress max=${length} value=${done}></progress>
      </div>
    </article>
  `
}
