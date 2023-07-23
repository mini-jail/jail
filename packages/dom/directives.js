import { toCamelCase, toKebabCase } from "./helpers.js"

const Events = Symbol()
const If = Symbol()
const RegisteredEvents = {}

/**
 * @param {Event} event
 */
function delegatedEventListener(event) {
  const type = event.type
  let elt = event.target
  while (elt !== null) {
    elt?.[Events]?.[type]?.forEach?.((listener) => listener.call(elt, event))
    elt = elt.parentNode
  }
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<(elt: import("./types.d.ts").DOMElement) => void>} binding
 */
export function refDirective(elt, binding) {
  binding.rawValue?.(elt)
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<string>} binding
 */
export function styleDirective(elt, binding) {
  elt.style[binding.arg] = binding.value || null
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<any>} binding
 */
export function bindDirective(elt, binding) {
  let prop = binding.arg
  if (binding.modifiers?.camel) {
    prop = toCamelCase(prop)
  }
  if (binding.modifiers?.attr) {
    prop = toKebabCase(prop)
  }
  if (
    binding.modifiers?.prop === true ||
    prop in elt && binding.modifiers?.attr === false
  ) {
    elt[prop] = binding.value
  } else {
    elt.setAttribute(prop, binding.value + "")
  }
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<string>} binding
 */
export function htmlDirective(elt, binding) {
  elt.innerHTML = binding.value
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<string>} binding
 */
export function textDirective(elt, binding) {
  elt.textContent = binding.value
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<boolean>} binding
 */
export function showDirective(elt, binding) {
  elt.style.display = binding.value ? "" : "none"
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<boolean>} binding
 */
export function ifDirective(elt, binding) {
  elt[If] = elt[If] || new Text()
  const value = binding.value, target = value ? elt[If] : elt
  target.replaceWith(value ? elt : elt[If])
}

/**
 * @param {import("./types.d.ts").DOMElement} elt
 * @param {import("./types.d.ts").Binding<(event: Event) => void>} binding
 */
export function onDirective(elt, binding) {
  const name = binding.arg
  const modifiers = binding.modifiers
  let id = name, listener = binding.rawValue, eventOptions
  if (modifiers) {
    if (modifiers.prevent) {
      id = id + "-prevent"
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.stop) {
      id = id + "-stop"
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.once) {
      id = id + "-once"
      eventOptions = eventOptions || {}
      eventOptions.once = true
    }
    if (modifiers.capture) {
      id = id + "-capture"
      eventOptions = eventOptions || {}
      eventOptions.capture = true
    }
    if (modifiers.passive) {
      id = id + "-passive"
      eventOptions = eventOptions || {}
      eventOptions.passive = true
    }
  }
  if (modifiers?.delegate) {
    elt[Events] = elt[Events] || {}
    elt[Events][name] = elt[Events][name] || []
    elt[Events][name].push(listener)
    if (RegisteredEvents[id] === undefined) {
      addEventListener(name, delegatedEventListener, eventOptions)
      RegisteredEvents[id] = true
    }
  } else {
    elt.addEventListener(name, listener, eventOptions)
  }
}
