import { onCleanup } from "space/signal"

/**
 * @type {Record<string, true | undefined>}
 */
const events = {}

/**
 * @param {import("../mod.js").DOMElement} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { arg, context, evaluate, modifiers }) {
  if (arg === null) {
    return console.warn(`missing "arg"! s-on:[click, ...]`)
  }
  elt.__events = elt.__events ?? (elt.__events = {})
  elt.__events[arg] = (event) => {
    context.$event = event
    evaluate()
    delete context.$event
  }
  onCleanup(() => delete elt.__events[arg])
  const eventOptions = {
      capture: modifiers?.capture,
      passive: modifiers?.passive,
    },
    bindOptions = {
      once: modifiers?.once,
      prevent: modifiers?.prevent,
      stop: modifiers?.stop,
    }
  const id = JSON.stringify({ arg, eventOptions })
  if (events[id] === undefined) {
    events[id] = true
    addEventListener(arg, eventListener.bind(bindOptions), eventOptions)
  }
}

/**
 * @this {{
 *   stop: boolean | undefined
 *   prevent: boolean | undefined
 *   once: boolean | undefined
 * }}
 * @param {Event | Record<string, any>} event
 */
function eventListener(event) {
  let elt = event.target
  const type = event.type
  if (this.stop) {
    event.stopPropagation()
  }
  if (this.prevent) {
    event.preventDefault()
  }
  while (elt) {
    if (elt?.__events?.[type]) {
      elt.__events[type].call(elt, event)
      if (this.once) {
        elt.__events[type] = undefined
      }
    }
    elt = elt.parentNode
  }
}
