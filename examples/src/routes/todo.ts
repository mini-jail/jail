import { memo, signal } from "space/signal"
import html, { DOMEvent } from "space/dom"

type ToDoItem = {
  id: number
  done: boolean
  text: string
}

const list = signal<ToDoItem[]>([
  { id: 0, done: true, text: "eat cornflakes without soymilk" },
  { id: 1, done: false, text: "buy soymilk" },
])

const Item = (props: ToDoItem) => {
  const deleteItem = (_ev: Event) => {
    list.value = list.value.filter((item) => item.id !== props.id)
  }
  const toggleItem = (_ev: Event) => {
    props.done = !props.done
    list.value = list.value.slice()
  }
  return html`
    <div class="todo-item">
      <div 
        class="todo-item-text" on:click=${toggleItem}
        style="${props.done ? "color: grey; font-style: italic;" : null}"
      >
        ${props.text}
      </div>
      <div d-show=${props.done} class="todo-item-delete" onClick=${deleteItem}>
        delete
      </div>
    </div>
  `
}

export default function ToDo() {
  const text = signal("")
  const addItem = () => {
    list.value = list.value.concat({
      id: Date.now(),
      done: false,
      text: text.value,
    })
    text.value = ""
  }
  const onInput = (ev: DOMEvent<HTMLInputElement>) => {
    text.value = ev.target.value
  }
  const length = memo(() => list.value.length, 0)
  const done = memo(() => {
    return list.value.filter((item) => item.done).length
  }, 0)

  return html`
    <article class="todo-app">
      <h4>
        todo
        <sub>(no-one ever have done that, i promise!)</sub>
      </h4>
      <div class="todo-app-container">
        <form onSubmit.prevent=${addItem}>
          <input 
            type="text" placeholder="...milk?"
            required class="todo_input" value=${text}
            onInput=${onInput}
          />
        </form>
        <div class="todo-items">
          <For each=${list}>
            ${(item: ToDoItem) => Item(item)}
          </For>
        </div>
        <label>progress: ${done}/${length}</label>
        <progress max=${length} value=${done}></progress>
      </div>
    </article>
  `
}
