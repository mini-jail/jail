const RegisteredEvents = {}
const Events = Symbol("Events")

export const {
  replace,
  slice,
  includes,
  startsWith,
  match,
  trim,
  toUpperCase,
  toLocaleLowerCase,
} = String.prototype
export const { replaceChild, insertBefore, isEqualNode, cloneNode } =
  Node.prototype
export const { getAttribute, setAttribute, removeAttribute } = Element.prototype
/**
 * @type {(query: string) => Iterable<DOMElement>}
 */
export const query = DocumentFragment.prototype.querySelectorAll
export const push = Array.prototype.push

/**
 * @param {string} data
 * @returns {string}
 */
export function toCamelCase(data) {
  return replace.call(
    data,
    /-([a-z])/g,
    (_match, group) => toUpperCase.call(group),
  )
}

/**
 * @param {string} data
 * @returns {string}
 */
export function toKebabCase(data) {
  return replace.call(
    data,
    /([A-Z])/g,
    (_match, group) => toLocaleLowerCase.call(group),
  )
}

/**
 * @param {Event} event
 */
function eventLoop(event) {
  const type = event.type
  let elt = event.target
  while (elt !== null) {
    elt?.[Events]?.[type]?.call(elt, event)
    elt = elt.parentNode
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<jail.DOMElement>} binding
 */
export function ref(elt, binding) {
  if (typeof binding.rawValue === "function") {
    binding.rawValue(elt)
  }
  if ("value" in binding.rawValue) {
    binding.rawValue.value = elt
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<string>} binding
 */
export function style(elt, binding) {
  elt.style[binding.arg] = binding.value || null
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding} binding
 */
export function bind(elt, binding) {
  let prop = binding.arg
  if (binding.modifiers?.camel || binding.modifiers?.prop) {
    prop = toCamelCase(prop)
  }
  if (binding.modifiers?.attr) {
    prop = toKebabCase(prop)
  }
  if (
    binding.modifiers?.prop === true ||
    (prop in elt && binding.modifiers?.attr === false)
  ) {
    elt[prop] = binding.value
  } else {
    elt.setAttribute(prop, String(binding.value))
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<string>} binding
 */
export function html(elt, binding) {
  elt.innerHTML = binding.value
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<string>} binding
 */
export function text(elt, binding) {
  elt.textContent = binding.value
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<boolean>} binding
 */
export function show(elt, binding) {
  elt.style.display = binding.value ? null : "none"
}

/**
 * @param {jail.DOMElement} elt
 * @param {jail.Binding<(event: Event) => void>} binding
 */
export function on(elt, binding) {
  if (binding.arg === null) {
    console.info(`missing name: [d-|prefix]on:[arg=name]...`)
    return
  }
  const name = binding.arg
  const modifiers = binding.modifiers
  let identifier = name,
    listener = binding.rawValue,
    eventOptions
  if (modifiers) {
    if (modifiers.prevent) {
      identifier += "-prevent"
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        preventDefault.call(event)
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.stop) {
      identifier += "-stop"
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.once) {
      identifier += "-once"
      eventOptions = eventOptions || {}
      eventOptions.once = true
    }
    if (modifiers.capture) {
      identifier += "-capture"
      eventOptions = eventOptions || {}
      eventOptions.capture = true
    }
    if (modifiers.passive) {
      identifier += "-passive"
      eventOptions = eventOptions || {}
      eventOptions.passive = true
    }
  }
  if (modifiers?.delegate) {
    elt[Events] = elt[Events] || {}
    if (elt[Events][name]) {
      const listenerCopy = elt[Events][name]
      elt[Events][name] = function (event) {
        listenerCopy.call(elt, event)
        listener.call(elt, event)
      }
    } else {
      elt[Events][name] = listener
    }
    if (RegisteredEvents[identifier] === undefined) {
      addEventListener(name, eventLoop, eventOptions)
      RegisteredEvents[identifier] = true
    }
  } else {
    elt.addEventListener(name, listener, eventOptions)
  }
}
