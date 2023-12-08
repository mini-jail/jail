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

export default function (
  elt: DOMElement,
  arg: string,
  value: EventListener,
): void {
  const options: AddEventListenerOptions = {},
    name = arg.match(nameRegExp)?.[0]!
  let target: DOMElement | Document = elt,
    delegate = false,
    listener = value
  arg.match(argRegExp)?.forEach((option) => {
    switch (option) {
      case "Once":
        return options.once = true
      case "Caputure":
        return options.capture = true
      case "Passice":
        return options.passive = true
      case "Prevent": {
        const originalListener = listener
        return listener = function (event) {
          event.preventDefault()
          return originalListener.call(target, event)
        }
      }
      case "Stop": {
        const originalListener = listener
        return listener = function (event) {
          event.stopPropagation()
          return originalListener.call(target, event)
        }
      }
      case "Delegate": {
        delegate = true
        target = document
        elt[eventsSymbol] = elt[eventsSymbol] ?? {}
        elt[eventsSymbol][name] = elt[eventsSymbol][name] ?? new Set()
        elt[eventsSymbol][name].add(listener)
      }
    }
  })
  if (delegate) {
    const id = JSON.stringify({ name, options })
    if (delegatedEvents[id] === undefined) {
      delegatedEvents[id] = true
      target.addEventListener(name, delegatedEventListener, options)
    }
    onCleanup(() => {
      elt[eventsSymbol][name].delete(listener)
    })
  } else {
    target.addEventListener(name, listener, options)
    onCleanup(() => {
      target.removeEventListener(name, listener, options)
    })
  }
}
