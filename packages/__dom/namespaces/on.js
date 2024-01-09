const delegatedEventsKey = Symbol("DelegatedEvents")
/**
 * @type {Record<string, true | undefined>}
 */
const delegatedEvents = {}
const argRegExp = /[A-Z][a-z]+/g
const nameRegExp = /[a-z]+/

/**
 * @param {import("space/dom").DOMElement} elt
 * @param {string} arg
 * @param {import("space/dom").DOMEventListener<any>} value
 */
export function on(elt, arg, value) {
  const listenerOptions = {},
    options = {},
    name = arg.match(nameRegExp)?.[0] + ""
  arg.match(argRegExp)?.forEach((option) => {
    switch (option) {
      case "Once":
        return options.once = true
      case "Prevent":
        return options.prevent = true
      case "Stop": {
        return options.stop = true
      }
      case "Capture":
        return listenerOptions.capture = true
      case "Passive":
        return listenerOptions.passive = true
    }
  })
  if (elt[delegatedEventsKey] === undefined) {
    elt[delegatedEventsKey] = {}
  }
  const id = JSON.stringify({ name, listenerOptions })
  elt[delegatedEventsKey][name] = value
  if (delegatedEvents[id] === undefined) {
    delegatedEvents[id] = true
    addEventListener(
      name,
      eventListener.bind(options),
      listenerOptions,
    )
  }
}

/**
 * @this {{ stop?: boolean, prevent?: boolean, once?: boolean }}
 * @param {import("space/dom").DOMEvent<any>} event
 */
function eventListener(event) {
  let elt = event.target
  while (elt !== null) {
    if (elt?.[delegatedEventsKey]?.[event.type]) {
      if (this.stop) {
        event.stopPropagation()
      }
      if (this.prevent) {
        event.preventDefault()
      }
      elt[delegatedEventsKey][event.type].call(elt, event)
      if (this.once) {
        elt[delegatedEventsKey][event.type] = undefined
      }
    }
    elt = elt.parentNode
  }
}
