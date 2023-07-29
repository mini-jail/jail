/// <reference types="./mod.d.ts" />
import {
  createEffect,
  createRoot,
  inject,
  isReactive,
  onCleanup,
  onUnmount,
  provide,
  toValue,
} from "jail/signal"

export const APP_INJECTION_KEY = Symbol()
const ON_DEL_DIR_SYM = Symbol(), IF_DIR_SYM = Symbol()
const TYPE = "__type", VALUE = "__value", QUERY = `[${TYPE}]`
const DIR_PREFIX = "d-", DIR_PREFIX_LENGTH = DIR_PREFIX.length
const DIR_RE = RegExp(`${sub(DIR_PREFIX, "-", "\\-")}[^"'<>=\\s]`),
  DIR_KEY_RE = /[a-z\-\_]+/,
  ARG_RE = /#{(\d+)}/g,
  SINGLE_VALUE_RE = /^@{(\d+)}$/,
  KEBAB_NAME_RE = /-[a-z]/g,
  CAMEL_NAME_RE = /([A-Z])/g,
  MULTI_VALUE_RE = /@{(\d+)}/g,
  KEY_VALUE_RE = /^([^\s]+)\s(.*)$/,
  BINDING_MOD_RE = /\.(?:[^"'.])+/g,
  BINDING_ARG_RE = /:([^"'<>.]+)/,
  START_WS_RE = /^[\s]+/gm,
  CONTENT_RE = /^\r\n|\n|\r(>)\s+(<)$/gm,
  QUOTE_RE = /["']/,
  COMP_RE = /^<((?:[A-Z][a-z]+)+)/,
  CLOSING_COMP_RE = /<\/(?:[A-Z][a-z]+)+>/g,
  TAG_RE = /<(([a-z\-]+)(?:"[^"]*"|'[^']*'|[^'">])*)>/gi,
  SC_TAG_RE = /<([a-zA-Z-]+)(("[^"]*"|'[^']*'|[^'">])*)\s*\/>/g,
  ATTR_RE =
    /\s([a-z]+[^\s=>"']*)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^\s=>"']+)))?/gi
const ATTR_DATA = `<$1 ${TYPE}="attr">`,
  SLOT_DATA = `<slot ${TYPE}="slot" ${VALUE}="$1"></slot>`,
  COMP_DATA = [`<template ${TYPE}="comp" ${VALUE}="$1"`, "</template>"]
/**
 * @type {Map<TemplateStringsArray, DocumentFragment>}
 */
const FRAGMENT_CACHE = new Map()
/**
 * @type {{ [value: string]: string | string[] | undefined }}
 */
const ATTR_VALUE_CACHE = {}
/**
 * @type {{ [name: string]: boolean | undefined }}
 */
const DELEGATED_EVENTS = {}
const SC_TAGS = {
  "area": true,
  "base": true,
  "br": true,
  "col": true,
  "command": true,
  "embed": true,
  "hr": true,
  "img": true,
  "input": true,
  "keygen": true,
  "link": true,
  "meta": true,
  "param": true,
  "source": true,
  "track": true,
  "wbr": true,
  "circle": true,
  "ellipse": true,
  "line": true,
  "path": true,
  "polygon": true,
  "polyline": true,
  "rect": true,
  "stop": true,
  "use": true,
}

/**
 * @param {string} name
 * @param {import("jail/dom").Directive} directive
 * @returns {void}
 */
export function createDirective(name, directive) {
  const directives = inject(APP_INJECTION_KEY).directives
  if (name in directives) {
    const directiveCopy = directives[name]
    onUnmount(() => directives[name] = directiveCopy)
  }
  directives[name] = directive
}

/**
 * @param {string} name
 * @param {import("jail/dom").Component} component
 * @returns {void}
 */
export function createComponent(name, component) {
  const components = inject(APP_INJECTION_KEY).components
  if (name in components) {
    const componentCopy = components[name]
    onUnmount(() => components[name] = componentCopy)
  }
  components[name] = component
}

/**
 * @param {import("jail/dom").DOMElement} rootElement
 * @param {import("jail/dom").RootComp} rootComp
 * @returns {import("jail/signal").Cleanup}
 */
export function mount(rootElement, rootComp) {
  return createRoot((cleanup) => {
    provide(APP_INJECTION_KEY, {
      directives: {
        on: onDirective,
        ref: refDirective,
        show: showDirective,
        html: htmlDirective,
        text: textDirective,
        style: styleDirective,
        bind: bindDirective,
        if: ifDirective,
      },
      components: {},
    })
    let anchor = rootElement.appendChild(new Text())
    let currentNodes = null
    createEffect(() => {
      const nextNodes = createNodeArray([], rootComp())
      reconcileNodes(anchor, currentNodes, nextNodes)
      currentNodes = nextNodes
    })
    onCleanup(() => {
      reconcileNodes(anchor, currentNodes, [])
      anchor.remove()
      anchor = null
      currentNodes = null
    })
    return cleanup
  })
}

/**
 * @param {TemplateStringsArray} templateStrings
 * @param  {...import("jail/dom").Slot[]} slots
 * @returns {import("jail/dom").RenderResult}
 */
export function template(templateStrings, ...slots) {
  return render(createOrGetFragment(templateStrings), slots)
}

/**
 * @type {import("jail/dom").RenderTypeMap}
 */
const renderMap = {
  attr: (elt, slots) => {
    const props = createProps(elt, slots)
    for (const key in props) {
      renderAttr(elt, key, props[key])
    }
  },
  slot: (elt, slots) => {
    const key = elt.getAttribute(VALUE)
    renderChild(elt, slots[key])
  },
  comp: (elt, slots) => {
    const name = elt.getAttribute(VALUE)
    const component = inject(APP_INJECTION_KEY).components[name]
    if (component === undefined) {
      elt.remove()
      return
    }
    createRoot(() => {
      const props = createProps(elt, slots)
      if (elt.content.hasChildNodes()) {
        props.children = render(elt.content, slots)
      }
      renderChild(elt, component(props))
    })
  },
}

/**
 * @param {DocumentFragment} fragment
 * @param {import("jail/dom").Slot[]} slots
 * @returns {import("jail/dom").RenderResult}
 */
function render(fragment, slots) {
  for (const elt of fragment.querySelectorAll(QUERY)) {
    const type = elt.getAttribute(TYPE)
    elt.removeAttribute(TYPE)
    renderMap[type]?.(elt, slots)
  }
  const nodeList = fragment.childNodes
  if (nodeList.length === 0) {
    return
  }
  if (nodeList.length === 1) {
    return nodeList[0]
  }
  return Array.from(nodeList)
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Slot[]} slots
 * @returns {import("jail/dom").Properties}
 */
function createProps(elt, slots) {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith("__")) {
      const match = elt.dataset[key].match(KEY_VALUE_RE)
      props[match[1]] = createValue(match[2], slots)
      delete elt.dataset[key]
    }
  }
  return props
}

/**
 * @param {string} value
 * @returns {string | string[] | undefined}
 */
function getOrCreateValueCache(value) {
  if (value in ATTR_VALUE_CACHE) {
    return ATTR_VALUE_CACHE[value]
  }
  const id = value.match(SINGLE_VALUE_RE)?.[1]
  if (id) {
    return ATTR_VALUE_CACHE[value] = id
  }
  const matches = [...value.matchAll(MULTI_VALUE_RE)]
  if (matches.length === 0) {
    return ATTR_VALUE_CACHE[value] = undefined
  }
  return ATTR_VALUE_CACHE[value] = matches.map((match) => match[1])
}

/**
 * @param {string} value
 * @param {import("jail/dom").Slot[]} slots
 * @returns {string | (() => string) | any}
 */
function createValue(value, slots) {
  const keyOrKeys = getOrCreateValueCache(value)
  if (keyOrKeys === undefined) {
    return value
  }
  if (typeof keyOrKeys === "string") {
    return slots[keyOrKeys]
  }
  if (keyOrKeys.some((key) => isReactive(slots[key]))) {
    return () => sub(value, MULTI_VALUE_RE, (_, key) => toValue(slots[key]))
  }
  return sub(value, MULTI_VALUE_RE, (_, key) => slots[key])
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {string}
 */
export function createTemplateString(strings) {
  let templateString = "", arg = 0
  while (arg < strings.length - 1) {
    templateString = templateString + strings[arg] + `#{${arg++}}`
  }
  templateString = templateString + strings[arg]
  templateString = sub(templateString, START_WS_RE, "")
  templateString = sub(templateString, SC_TAG_RE, (match, tag, attr) => {
    return SC_TAGS[tag] ? match : `<${tag}${attr}></${tag}>`
  })
  templateString = sub(templateString, CLOSING_COMP_RE, COMP_DATA[1])
  templateString = sub(templateString, TAG_RE, (match) => {
    const isComp = COMP_RE.test(match)
    let id = 0
    match = sub(match, ATTR_RE, (match, name, val1, val2, val3) => {
      if (isComp === false) {
        if (!ARG_RE.test(match) && !DIR_RE.test(match)) {
          return match
        }
      }
      const quote = match.match(QUOTE_RE)?.[0] || `"`
      const value = sub(val1 ?? val2 ?? val3 ?? "", ARG_RE, "@{$1}")
      return ` data-__${id++}=${quote}${name} ${value}${quote}`
    })
    if (isComp) {
      match = sub(match, COMP_RE, COMP_DATA[0])
    } else if (id !== 0) {
      match = sub(match, TAG_RE, ATTR_DATA)
    }
    return match
  })
  templateString = sub(templateString, ARG_RE, SLOT_DATA)
  templateString = sub(templateString, CONTENT_RE, "$1$2")
  return templateString
}

/**
 * @param {TemplateStringsArray} templateStrings
 * @returns {DocumentFragment}
 */
function createOrGetFragment(templateStrings) {
  let template = FRAGMENT_CACHE.get(templateStrings)
  if (template === undefined) {
    const element = document.createElement("template")
    element.innerHTML = createTemplateString(templateStrings)
    template = element.content
    FRAGMENT_CACHE.set(templateStrings, element.content)
  }
  return template.cloneNode(true)
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {any} value
 */
function renderChild(elt, value) {
  if (value == null || typeof value === "boolean") {
    elt.remove()
  } else if (value instanceof Node) {
    elt.replaceWith(value)
  } else if (isReactive(value)) {
    renderDynamicChild(elt, value)
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      elt.remove()
    } else if (value.length === 1) {
      renderChild(elt, value[0])
    } else if (value.some((item) => isReactive(item))) {
      renderDynamicChild(elt, value)
    } else {
      elt.replaceWith(...createNodeArray([], ...value))
    }
  } else {
    elt.replaceWith(value + "")
  }
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {(() => any) | any[]} childElement
 */
function renderDynamicChild(elt, childElement) {
  const anchor = new Text()
  elt.replaceWith(anchor)
  createEffect((currentNodes) => {
    const nextNodes = createNodeArray([], toValue(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, null)
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {string} prop
 * @param {any} data
 */
function renderAttr(elt, prop, data) {
  if (prop.startsWith(DIR_PREFIX)) {
    const key = prop.slice(DIR_PREFIX_LENGTH).match(DIR_KEY_RE)[0]
    const directive = inject(APP_INJECTION_KEY).directives[key]
    if (directive) {
      const binding = createBinding(prop, data)
      createEffect(() => directive(elt, binding))
    }
  } else if (isReactive(data)) {
    createEffect((currentValue) => {
      const nextValue = toValue(data)
      if (nextValue !== currentValue) {
        setProperty(elt, prop, nextValue)
      }
      return nextValue
    })
  } else {
    setProperty(elt, prop, data)
  }
}

/**
 * @param {string} prop
 * @param {any} rawValue
 * @returns {import("jail/dom").Binding}
 */
function createBinding(prop, rawValue) {
  const arg = prop.match(BINDING_ARG_RE)?.[1] || null
  const modifiers = prop.match(BINDING_MOD_RE)?.reduce((modifiers, key) => {
    modifiers[key.slice(1)] = true
    return modifiers
  }, {}) || null
  return {
    get value() {
      return toValue(rawValue)
    },
    rawValue,
    arg,
    modifiers,
  }
}

/**
 * @param {import("jail/dom").DOMNode[]} nodeArray
 * @param  {...import("jail/dom").Element} elements
 * @returns {import("jail/dom").DOMNode[]}
 */
function createNodeArray(nodeArray, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    }
    if (elt instanceof DocumentFragment) {
      nodeArray.push(...elt.childNodes)
    } else if (elt instanceof Node) {
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (isReactive(elt)) {
      createNodeArray(nodeArray, toValue(elt))
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt)
    }
  }
  return nodeArray
}

/**
 * @param {import("jail/dom").DOMNode} anchor
 * @param {(import("jail/dom").DOMNode | null)[] | null} currentNodes
 * @param {import("jail/dom").DOMNode[]} nextNodes
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  const parentNode = anchor.parentNode
  if (currentNodes === null) {
    for (const nextNode of nextNodes) {
      parentNode?.insertBefore(nextNode, anchor)
    }
    return
  }
  let i = 0, j = 0, c = currentNodes.length, n = nextNodes.length
  next:
  for (; i < n; i++) {
    const currentNode = currentNodes[i]
    for (; j < c; j++) {
      if (currentNodes[j] === null) {
        continue
      }
      if (sameCharacterDataType(currentNodes[j], nextNodes[i])) {
        currentNodes[j].data = nextNodes[i].data
        nextNodes[i] = currentNodes[j]
      } else if (currentNodes[j].isEqualNode(nextNodes[i])) {
        nextNodes[i] = currentNodes[j]
      }
      if (nextNodes[i] === currentNodes[j]) {
        currentNodes[j] = null
        if (i === j) {
          continue next
        }
        break
      }
    }
    parentNode?.insertBefore(nextNodes[i], currentNode?.nextSibling || anchor)
  }
  while (currentNodes.length) {
    currentNodes.pop()?.remove()
  }
}

/**
 * @param {string} data
 * @returns {string}
 */
function toCamelCase(data) {
  return sub(data, KEBAB_NAME_RE, (match) => match.slice(1).toUpperCase())
}

/**
 * @param {string} data
 * @returns {string}
 */
function toKebabCase(data) {
  return sub(data, CAMEL_NAME_RE, "-$1").toLowerCase()
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {string} prop
 * @param {any} value
 */
function setProperty(elt, prop, value) {
  if (prop in elt) {
    elt[prop] = value
    return
  }
  const name = toKebabCase(prop)
  if (value != null) {
    elt.setAttribute(name, value + "")
  } else {
    elt.removeAttribute(name)
  }
}

function sameCharacterDataType(node, otherNode) {
  const type = node.nodeType
  return (type === 3 || type === 8) && otherNode.nodeType === type
}

/**
 * @param {Event} event
 */
function delegatedEventListener(event) {
  const type = event.type
  let elt = event.target
  while (elt !== null) {
    elt?.[ON_DEL_DIR_SYM]?.[type]?.forEach?.((fn) => fn.call(elt, event))
    elt = elt.parentNode
  }
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<(elt: import("jail/dom").DOMElement) => void>} binding
 */
function refDirective(elt, binding) {
  binding.rawValue?.(elt)
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<string>} binding
 */
function styleDirective(elt, binding) {
  elt.style[binding.arg] = binding.value || null
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding} binding
 */
function bindDirective(elt, binding) {
  let prop = binding.arg
  if (binding.modifiers?.camel) {
    prop = toCamelCase(prop)
  } else if (binding.modifiers?.attr) {
    prop = toKebabCase(prop)
  }
  if (binding.modifiers?.prop === true || prop in elt) {
    elt[prop] = binding.value
  } else {
    elt.setAttribute(prop, binding.value + "")
  }
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<string>} binding
 */
function htmlDirective(elt, binding) {
  elt.innerHTML = binding.value
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<string>} binding
 */
function textDirective(elt, binding) {
  elt.textContent = binding.value
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<boolean>} binding
 */
function showDirective(elt, binding) {
  elt.style.display = binding.value ? "" : "none"
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<boolean>} binding
 */
function ifDirective(elt, binding) {
  elt[IF_DIR_SYM] = elt[IF_DIR_SYM] ?? new Text()
  const value = binding.value, target = value ? elt[IF_DIR_SYM] : elt
  target.replaceWith(value ? elt : elt[IF_DIR_SYM])
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<import("jail/dom").DOMListener>} binding
 */
function onDirective(elt, binding) {
  const name = binding.arg
  const modifiers = binding.modifiers
  let id = name, listener = binding.rawValue, eventOptions
  if (modifiers) {
    const { once, capture, passive } = modifiers
    eventOptions = { once, capture, passive }
    if (modifiers.prevent) {
      id = id + "_prevent"
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers.stop) {
      id = id + "_stop"
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (once) {
      id = id + "_once"
    }
    if (capture) {
      id = id + "_capture"
    }
    if (passive) {
      id = id + "_passive"
    }
  }
  if (modifiers?.delegate) {
    elt[ON_DEL_DIR_SYM] = elt[ON_DEL_DIR_SYM] || {}
    elt[ON_DEL_DIR_SYM][name] = elt[ON_DEL_DIR_SYM][name] || []
    elt[ON_DEL_DIR_SYM][name].push(listener)
    if (DELEGATED_EVENTS[id] === undefined) {
      addEventListener(name, delegatedEventListener, eventOptions)
      DELEGATED_EVENTS[id] = true
    }
  } else {
    elt.addEventListener(name, listener, eventOptions)
  }
}

/**
 * @overload
 * @param {string} data
 * @param {string | RegExp} match
 * @param {string} replacer
 * @returns {string}
 */
/**
 * @overload
 * @param {string} data
 * @param {string | RegExp} match
 * @param {(match: string, ...matches: (string | number | undefined)[]) => string} replacer
 * @returns {string}
 */
/**
 * @param {string} data
 * @param {string | RegExp} match
 * @param {any} replacer
 * @returns {string}
 */
function sub(data, match, replacer) {
  return data.replace(match, replacer)
}
