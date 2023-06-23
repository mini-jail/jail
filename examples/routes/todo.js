import { createSignal } from "signal";
import { template } from "signal/dom";

/**
 * @typedef {{
 *  id: number
 *  done: boolean
 *  text: string
 * }} TodoItem
 */

/** @type {import("signal").Signal<TodoItem[]>} */
const list = createSignal([
  { id: 0, done: true, text: "eat cornflakes without soymilk" },
  { id: 1, done: false, text: "buy soymilk" },
]);

const Item = (props) => {
  const deleteItem = () => list(list().filter((item) => item.id !== props.id));
  const toggleItem = () => {
    list((items) => {
      props.done = !props.done;
      return items;
    });
  };

  return template`
    <div class="todo-item" id="${"item_id_" + props.id}">
      <div 
        class="todo-item-text" 
        style="${props.done ? "color: green; font-style: italic;" : null}"
        d-on:click="${toggleItem}"
      >
        ${list().indexOf(props) + 1}. ${props.text}
      </div>
      <div class="todo-item-delete" d-on:click="${deleteItem}">
        delete
      </div>
    </div>
  `;
};

export default () => {
  const textValue = createSignal("");

  const addItem = (ev) => {
    if (ev.key === "Enter") {
      list(list().concat({ id: Date.now(), done: false, text: textValue() }));
      textValue("");
      return;
    }
  };

  const onInput = (ev) => textValue(ev.target.value);
  const length = () => list().length;
  const done = () => list().filter((item) => item.done).length;

  return template`
    <article class="todo-app">
      <h4>
        todo
        <sub>(no-one ever have done that, i promise!)</sub>
      </h4>
      <div class="todo-app-container">
        <input type="text"
               placeholder="...milk?"
               required
               class="todo_input"
               value="${textValue}" 
               d-on:keyup.delegate="${addItem}" 
               d-on:input.delegate="${onInput}"/>
        <div class="todo-items">
          ${() => list().map((item) => Item(item))}
        </div>
        <label>progress: ${done}/${length}</label>
        <progress max="${length}" value="${done}"></progress>
      </div>
    </article>

    <style>
      .todo-app-container {
        width: 500px;
        background-color: rgba(255, 255, 255, .5);
        padding: 10px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .todo-item {
        display: flex;
        gap: 20px;
        justify-content: space-between;
        cursor: pointer;
      }
      .todo-item-text {
        text-align: left;
        flex: 1;
      }
      .todo-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .todo-item-delete:hover {
        color: indianred;
      }
      .todo-app progress {
        background-color: white;
        border: 0;
        height: 20px;
      }
      .todo-app input, 
      .todo-app label,
      .todo-app progress {
        width: 100%;
        display: block;
        margin: 0 auto;
      }
    </style>
  `;
};
