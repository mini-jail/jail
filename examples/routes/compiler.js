import { createTemplateString, template } from "jail/dom"
import { createSignal, untrack } from "jail/signal"

export default () => {
  const showExplanation = createSignal(false)
  const text = createSignal(
    `<div data-cool="user is \${state} cool!">\n  you are \${state} cool!\n</div>`,
  )
  const inputLength = () => text().length
  const time = createSignal(0)
  const timeMs = () => `millisecond${time() === 1 ? "" : "s"}`
  const compiled = () => {
    const start = performance.now()
    const data = text().replace(/\$\{[^${}]+\}/gm, "${}").split("${}")
    const result = createTemplateString(data)
    const end = performance.now()
    untrack(() => time(end - start))
    return result
  }
  const outputLength = () => compiled().length
  const onInput = (ev) => text(ev.currentTarget.value)
  const onClick = () => showExplanation(!showExplanation())
  const outputCSS = `
    min-height: 60px;
    background-color: white;
    box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);
  `
  const explainCSS = `
    background-color: papayawhip;
    padding: 10px;
    box-shadow: 4px 4px 0px rgba(0, 0, 0, .1);
  `

  return template`
    <article style="display: flex; gap: 8px; flex-direction: column;">
      <h4>
        compiler
        <sub>(4 real????)</sub>
      </h4>
      <button d-on:click="${onClick}" d-style:margin="0 auto">show/hide explanation</button>
      <pre d-show="${showExplanation}" style="${explainCSS}">
        1.   join string literals with "${"#{\\d+}"}"
        2.   go inside tags with this regexp (in general): 
        .    <span d-style:color="red">${/<([a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*)>/g}</span>
        3.   look for valid attributes with this regexp:
        .    <span d-style:color="red">${/\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g}</span>
        4.   replace dynamic values inside attributes with "${"@{\\d+}"}"
        5.   replace all other "${"#{\\d+}"}" with <span d-style:color="red">${`<slot __t="i" __v="\\d+"></slot>`}</span>
        6.   insert code into template element and extract its fragment
        7.   insert attributes, children and components inside fragment
        8.   ${"template`...`"} might return a single node, a node-array or undefined
      </pre>
      <pre style="display: flex; gap: 16px; flex-direction: column;">
        <label style="flex: 1;">input: (${inputLength} characters)</label>
        <textarea value="${text()}" d-on:input="${onInput}"></textarea>
        <label style="flex: 1;">output: (compiled in ${time} ${timeMs}, ${outputLength} characters)</label> 
        <pre style="${outputCSS}" d-text="${compiled}"></pre>
      </pre>
    </article>
  `
}
