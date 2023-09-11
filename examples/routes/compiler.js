import { createTemplateString, template } from "jail/dom"
import { createSignal, untrack } from "jail/signal"

export default () => {
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

  return template`
    <article style="display: flex; gap: 8px; flex-direction: column;">
      <h4>
        compiler
        <sub>(4 real????)</sub>
      </h4>
      <div style="display: flex; gap: 16px; flex-direction: column;">
        <label style="flex: 1;">input: (${inputLength} characters)</label>
        <textarea value=${text()} d-on:input=${onInput}></textarea>
        <label style="flex: 1;">output: (compiled in ${time} ${timeMs}, ${outputLength} characters)</label> 
        <pre style="min-height: 60px; background-color: white; box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);">
          ${compiled}
        </pre>
      </div>
    </article>
  `
}
