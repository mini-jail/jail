export const delegatedEventsSymbol = Symbol("DelegatedEvents")
/**
 * @type {Record<string, true | undefined>}
 */
const delegatedEvents = {}
const argRegExp = /[A-Z][a-z]+/g
const nameRegExp = /[a-z]+/

/**
 * @param {space.DOMElement} elt
 * @param {string} arg
 * @param {space.DOMEventListener} value
 */
export default function On(elt, arg, value) {
  const options = {}, name = arg.match(nameRegExp)?.[0] + ""
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

/**
 * @param {space.DOMElement} elt
 * @param {space.DOMEventListener} listener
 * @returns {space.DOMEventListener}
 */
function decoratePrevent(elt, listener) {
  const originalListener = listener
  return function (event) {
    event.preventDefault()
    return originalListener.call(elt, event)
  }
}

/**
 * @param {space.DOMElement} elt
 * @param {space.DOMEventListener} listener
 * @returns {space.DOMEventListener}
 */
function decorateStop(elt, listener) {
  const originalListener = listener
  return function (event) {
    event.stopPropagation()
    return originalListener.call(elt, event)
  }
}

/**
 * @param {space.DOMEvent} event
 */
function delegatedEventListener(event) {
  /**
   * @type {space.DOMParentNode | null}
   */
  let elt = event.target
  while (elt !== null) {
    elt
      ?.[delegatedEventsSymbol]
      ?.[event.type]
      // @ts-expect-error: elt won't be null
      ?.forEach((listener) => listener.call(elt, event))
    elt = elt.parentNode
  }
}
