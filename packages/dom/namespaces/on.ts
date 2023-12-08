import { type DOMElement } from "jail/dom"
import { onCleanup } from "jail/signal"

const eventsSymbol = Symbol()
const delegatedEvents: Record<string, true | undefined> = {}
const argRegExp = /[A-Z][a-z]+/g
const nameRegExp = /[a-z]+/

function delegatedEventListener(event: Event): void {
  const type = event.type
  let elt = event.target as DOMElement
  while (elt !== null) {
    elt?.[eventsSymbol]?.[type]?.forEach?.((fn) => fn.call(elt, event))
    elt = elt.parentNode as DOMElement
  }
}

export default function on(
  elt: DOMElement,
  arg: string,
  value: EventListener,
): void {
  const options: AddEventListenerOptions = {},
    name = arg.match(nameRegExp)?.[0]!
  let delegate = false
  arg.match(argRegExp)?.forEach((option) => {
    switch (option) {
      case "Once":
        return options.once = true
      case "Capture":
        return options.capture = true
      case "Passive":
        return options.passive = true
      case "Prevent":
        return value = decoratePrevent(elt, value)
      case "Stop": {
        return value = decorateStop(elt, value)
      }
      case "Delegate": {
        delegate = true
        elt[eventsSymbol] = elt[eventsSymbol] ?? {}
        elt[eventsSymbol][name] = elt[eventsSymbol][name] ?? new Set()
        elt[eventsSymbol][name].add(value)
      }
    }
  })
  if (delegate) {
    const id = JSON.stringify({ name, options })
    if (delegatedEvents[id] === undefined) {
      delegatedEvents[id] = true
      addEventListener(name, delegatedEventListener, options)
    }
    onCleanup(() => elt[eventsSymbol][name].delete(value))
  } else {
    elt.addEventListener(name, value, options)
    onCleanup(() => elt.removeEventListener(name, value, options))
  }
}

function decoratePrevent(elt: DOMElement, listener: EventListener) {
  const originalListener = listener
  return function (event: Event) {
    event.preventDefault()
    return originalListener.call(elt, event)
  }
}

function decorateStop(elt: DOMElement, listener: EventListener) {
  const originalListener = listener
  return function (event: Event) {
    event.stopPropagation()
    return originalListener.call(elt, event)
  }
}
