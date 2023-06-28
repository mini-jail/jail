import { createTemplateString, template } from "jail/dom"
import { createSignal, untrack } from "jail/signal"

export default () => {
  const showExplanation = createSignal(false)
  const text = createSignal(
    `<div data-cool="user is \${} cool!" id="\${}">\n  you are \${} cool!\n</div>`,
  )
  const time = createSignal(0)
  const timeMs = () => `millisecond${time() === 1 ? "" : "s"}`
  const compiled = () => {
    const start = performance.now()
    const result = createTemplateString(text().split("${}"))
    const end = performance.now()
    untrack(() => time(end - start))
    return result
  }
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
        0.   standard html stays standard html!
        1.   join string literals with "###\\d+###"
        2.   go inside tags with this regexp (in general): 
        .    <span d-style:color="red">${/<[a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*>/g}</span>
        3.   look for valid attributes with this regexp:
        .    <span d-style:color="red">${/\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g}</span>
        3.1. replace dynamic values inside attributes with "@@@\\d+@@@"
        4.   replace all other "###\\d+###" with <span d-style:color="red">${`<slot name="\${Ins}\\d+"></slot>`}</span>
        5.   insert code into template element and extract its fragment
        6.   tell compiler if it has insertable attributes &| children
        7.   insert attributes inside fragment
        8.   insert children inside fragment
        9.   insert result to target???
        10.  drink water
      </pre>
      <pre style="display: flex; gap: 16px; flex-direction: column;">
        <label style="flex: 1;">input:</label>
        <textarea value="${text()}" d-on:input="${onInput}"></textarea>
        <label style="flex: 1;">output:</label>
        <pre style="${outputCSS}" d-text="${compiled}"></pre>
        <pre>compiled in ${time} ${timeMs}</pre>
      </pre>
    </article>
  `
}
