import { effect, onCleanup } from "space/signal"

/**
 * @param {import("../mod.js").DOMElement} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { arg, evaluate, modifiers }) {
  const key = arg ?? "value",
    type = modifiers?.lazy ? "change" : "input",
    trim = !!modifiers?.trim,
    listener = () => {
      let value = String(elt.value)
      if (trim) {
        value = value.trim()
      }
      evaluate()[key] = elt.value
    }

  elt.addEventListener(type, listener)
  onCleanup(() => {
    elt.removeEventListener(type, listener)
  })
  effect(() => {
    let value = String(evaluate()[key])
    if (trim) {
      value = value.trim()
    }
    elt.value = value
  })
}
