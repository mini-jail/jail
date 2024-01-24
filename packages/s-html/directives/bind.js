import { onCleanup } from "space/signal"

/**
 * @param {Element} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { arg, modifiers, evaluate }) {
  let isProp = false, name = arg
  if (modifiers?.prop) {
    isProp = true
  }
  if (name === null) {
    const values = evaluate()
    for (const key in values) {
      setAttribute(elt, key, values[key], isProp)
    }
    return
  }
  if (modifiers?.camel || modifiers?.prop) {
    name = name.replace(/-([a-z])/g, (_match, str) => str.toUpperCase())
  }
  setAttribute(elt, name, evaluate(), isProp)
}

/**
 * @param {Element} elt
 * @param {string} name
 * @param {unknown} value
 * @param {boolean} isProp
 */
function setAttribute(elt, name, value, isProp) {
  let prev
  if (isProp) {
    prev = elt[name]
    elt[name] = value
    onCleanup(() => elt[name] = prev)
    return
  }
  prev = elt.getAttribute(name)
  if (value != null) {
    elt.setAttribute(name, String(value))
  } else {
    elt.removeAttribute(name)
  }
  onCleanup(() => {
    if (prev) {
      elt.setAttribute(name, prev)
    } else {
      elt.removeAttribute(name)
    }
  })
}
