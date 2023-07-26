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

export const AppInjectionKey = Symbol()
const DelegatedEvents = Symbol()
const IfDirectiveSymbol = Symbol()
const TYPE = "__type", VALUE = "__value"
const Query = `[${TYPE}]`
const DirPrefix = "d-",
  DirPrefixLength = DirPrefix.length,
  DirRegExp = RegExp(`${sub(DirPrefix, "-", "\\-")}[^"'<>=\\s]`),
  DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /#{(\d+)}/g,
  SingleValueRegExp = /^@{(\d+)}$/,
  MultiValueRegExp = /@{(\d+)}/g
const PropValueRegExp = /^([^\s]+)\s(.*)$/
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm, QuoteRegExp = /["']/
const CompRegExp = /^<((?:[A-Z][a-z]+)+)/,
  ClosingCompRegExp = /<\/(?:[A-Z][a-z]+)+>/g
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const AttrRegExp =
  /\s([^"'!?<>=\s]+)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^"'<>\s]+)))?/g
const AttrData = `<$1 ${TYPE}="attr">`
const SlotData = `<slot ${TYPE}="slot" ${VALUE}="$1"></slot>`
const CompData = [`<template ${TYPE}="comp" ${VALUE}="$1"`, "</template>"]
/**
 * @type {Map<TemplateStringsArray, DocumentFragment>}
 */
const TemplateCache = new Map()
/**
 * @type {{ [value: string]: string | string[] | undefined }}
 */
const ValueCache = {}
/**
 * @type {{ [name: string]: boolean | undefined }}
 */
const RegisteredEvents = {}

/**
 * @param {string} name
 * @param {import("jail/dom").Directive} directive
 * @returns {void}
 */
export function createDirective(name, directive) {
  const directives = inject(AppInjectionKey).directives
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
  const components = inject(AppInjectionKey).components
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
    provide(AppInjectionKey, {
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
 * @param {TemplateStringsArray} strings
 * @param  {...import("jail/dom").Slot[]} slots
 * @returns {import("jail/dom").TemplateResult}
 */
export function template(strings, ...slots) {
  return render(createOrGetTemplate(strings), slots)
}

/**
 * @type {import("jail/dom").RenderTypeMap}
 */
const renderMap = {
  attr(elt, slots) {
    const props = createProps(elt, slots)
    for (const key in props) {
      renderAttr(elt, key, props[key])
    }
  },
  slot(elt, slots) {
    const key = elt.getAttribute(VALUE)
    renderChild(elt, slots[key])
  },
  comp(elt, slots) {
    const name = elt.getAttribute(VALUE)
    const component = inject(AppInjectionKey).components[name]
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
 * @returns {import("jail/dom").TemplateResult}
 */
function render(fragment, slots) {
  for (const elt of fragment.querySelectorAll(Query)) {
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
      const match = elt.dataset[key].match(PropValueRegExp)
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
function getValueCache(value) {
  if (value in ValueCache) {
    return ValueCache[value]
  }
  const id = value.match(SingleValueRegExp)?.[1]
  if (id) {
    return ValueCache[value] = id
  }
  const matches = [...value.matchAll(MultiValueRegExp)]
  if (matches.length === 0) {
    return ValueCache[value] = undefined
  }
  return ValueCache[value] = matches.map((match) => match[1])
}

/**
 * @param {string} value
 * @param {import("jail/dom").Slot[]} slots
 * @returns {string | (() => string) | any}
 */
function createValue(value, slots) {
  const keyOrKeys = getValueCache(value)
  if (keyOrKeys === undefined) {
    return value
  }
  if (typeof keyOrKeys === "string") {
    return slots[keyOrKeys]
  }
  if (keyOrKeys.some((key) => isReactive(slots[key]))) {
    return () => sub(value, MultiValueRegExp, (_, key) => toValue(slots[key]))
  }
  return sub(value, MultiValueRegExp, (_, key) => slots[key])
}

const getId = () => ++getId.value
getId.value = -1

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
  templateString = sub(templateString, WSAndTabsRegExp, "")
  templateString = sub(templateString, ClosingCompRegExp, CompData[1])
  templateString = sub(templateString, TagRegExp, (data) => {
    const isComp = CompRegExp.test(data)
    let id = 0
    data = sub(data, AttrRegExp, (data, name, val1, val2, val3) => {
      if (isComp === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)?.[0] || `"`
      const value = sub(val1 ?? val2 ?? val3 ?? "", ArgRegExp, "@{$1}")
      return ` data-__${id++}=${quote}${name} ${value}${quote}`
    })
    if (isComp) {
      data = sub(data, CompRegExp, CompData[0])
    } else if (id !== 0) {
      data = sub(data, TagRegExp, AttrData)
    }
    return sub(data, ArgRegExp, "")
  })
  templateString = sub(templateString, ArgRegExp, SlotData)
  return templateString
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {DocumentFragment}
 */
function createOrGetTemplate(strings) {
  let template = TemplateCache.get(strings)
  if (template === undefined) {
    const element = document.createElement("template")
    element.innerHTML = createTemplateString(strings)
    TemplateCache.set(strings, element.content)
    template = element.content
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
  if (prop.startsWith(DirPrefix)) {
    const key = prop.slice(DirPrefixLength).match(DirKeyRegExp)[0]
    const directive = inject(AppInjectionKey).directives[key]
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
  const arg = prop.match(BindingArgRegExp)?.[1] || null
  const modifiers = prop.match(BindingModRegExp)?.reduce((modifiers, key) => {
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
 * @param  {...any} elements
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
  return sub(data, /-[a-z]/g, (match) => match.slice(1).toUpperCase())
}

/**
 * @param {string} data
 * @returns {string}
 */
function toKebabCase(data) {
  return sub(data, /([A-Z])/g, "-$1").toLowerCase()
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
    elt?.[DelegatedEvents]?.[type]?.forEach?.((fn) => fn.call(elt, event))
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
    elt.setAttr(prop, binding.value + "")
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
  elt[IfDirectiveSymbol] = elt[IfDirectiveSymbol] || new Text()
  const value = binding.value, target = value ? elt[IfDirectiveSymbol] : elt
  target.replaceWith(value ? elt : elt[IfDirectiveSymbol])
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
    elt[DelegatedEvents] = elt[DelegatedEvents] || {}
    elt[DelegatedEvents][name] = elt[DelegatedEvents][name] || []
    elt[DelegatedEvents][name].push(listener)
    if (RegisteredEvents[id] === undefined) {
      addEventListener(name, delegatedEventListener, eventOptions)
      RegisteredEvents[id] = true
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
