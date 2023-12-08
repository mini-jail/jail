import { type DOMElement } from "jail/dom"

const delegatedEventsSymbol = Symbol()
const delegatedEvents: Record<string, true | undefined> = {}
const argRegExp = /[A-Z][a-z]+/g
const nameRegExp = /[a-z]+/

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
        if (elt[delegatedEventsSymbol] === undefined) {
          elt[delegatedEventsSymbol] = {}
        }
        if (elt[delegatedEventsSymbol][name] === undefined) {
          elt[delegatedEventsSymbol][name] = []
        }
        elt[delegatedEventsSymbol][name].push(value)
      }
    }
  })
  if (delegate) {
    const id = JSON.stringify({ name, options })
    if (delegatedEvents[id] === undefined) {
      delegatedEvents[id] = true
      addEventListener(name, delegatedEventListener, options)
    }
  } else {
    elt.addEventListener(name, value, options)
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

function delegatedEventListener(event: Event): void {
  let elt = <DOMElement | null> event.target
  while (elt !== null) {
    elt
      ?.[delegatedEventsSymbol]
      ?.[event.type]
      ?.forEach((listener: EventListener) => listener.call(elt, event))
    elt = <DOMElement | null> elt.parentNode
  }
}
