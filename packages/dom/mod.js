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
const TYPE = "__t", VALUE = "__v"
const Query = `[${TYPE}]`
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${sub(DirPrefix, "-", "\\-")}[^"'<>=\\s]`)
const DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /#{([^\s}]+)}/g,
  SValRegExp = /^@{([^\s}]+)}$/,
  MValRegExp = /@{([^\s}]+)}/g,
  PropValueRegExp = /^([^\s]+)\s(.*)$/
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm
const QuoteRegExp = /["']/, DataRegExp = /data\-__\d+/
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/,
  ClosingComRegExp = /<\/(?:[A-Z][a-z]+)+>/g
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const AtrRegExp =
  /\s([^"'!?<>=\s]+)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^"'<>\s]+)))?/g
const AttributeReplacement = `<$1 ${TYPE}="a">`
const InsertionReplacement = `<slot ${TYPE}="i" ${VALUE}="$1"></slot>`
const ComponentReplacement = [
  `<template ${TYPE}="c" ${VALUE}="$1"`,
  "</template>",
]
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
 * @param {import("jail/dom").RootComponent} rootComponent
 * @returns {import("jail/signal").Cleanup}
 */
export function mount(rootElement, rootComponent) {
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
      const nextNodes = createNodeArray([], rootComponent())
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
 * @param  {...import("jail/dom").Arg} args
 * @returns {import("jail/dom").TemplateResult}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  return render(template.cloneNode(true), args)
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Arg[]} args
 */
function renderAttributeType(elt, args) {
  const props = createProps(elt, args)
  for (const key in props) {
    renderAttribute(elt, key, props[key])
  }
}

/**
 * @param {HTMLSlotElement} elt
 * @param {import("jail/dom").Arg[]} args
 */
function renderInsertionType(elt, args) {
  const slot = elt.getAttribute(VALUE)
  renderChild(elt, getValue(slot, args))
}

/**
 * @param {HTMLTemplateElement} elt
 * @param {import("jail/dom").Arg[]} args
 * @returns
 */
function renderComponentType(elt, args) {
  const name = elt.getAttribute(VALUE)
  const component = inject(AppInjectionKey).components[name]
  if (component === undefined) {
    elt.remove()
    return
  }
  createRoot(() => {
    const props = createProps(elt, args)
    if (elt.content.hasChildNodes()) {
      props.children = render(elt.content, args)
    }
    renderChild(elt, component(props))
  })
}

const renderMap = {
  a: renderAttributeType,
  i: renderInsertionType,
  c: renderComponentType,
}

/**
 * @param {DocumentFragment} fragment
 * @param {import("jail/dom").Arg[]} args
 * @returns {import("jail/dom").TemplateResult}
 */
function render(fragment, args) {
  for (const elt of fragment.querySelectorAll(Query)) {
    const type = elt.getAttribute(TYPE)
    elt.removeAttribute(TYPE)
    renderMap[type]?.(elt, args)
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
 * @param {import("jail/dom").Arg[]} args
 * @returns {import("jail/dom").Properties}
 */
function createProps(elt, args) {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith("__")) {
      const match = elt.dataset[key].match(PropValueRegExp)
      props[match[1]] = createValue(match[2], args)
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
  const id = value.match(SValRegExp)?.[1]
  if (id) {
    return ValueCache[value] = id
  }
  const matches = [...value.matchAll(MValRegExp)]
  if (matches.length === 0) {
    return ValueCache[value] = undefined
  }
  return ValueCache[value] = matches.map((match) => match[1])
}

/**
 * @param {string} value
 * @param {any[]} args
 * @returns {string | (() => string) | any}
 */
function createValue(value, args) {
  const cached = getValueCache(value)
  if (cached === undefined) {
    return value
  }
  if (typeof cached === "string") {
    return getValue(cached, args)
  }
  if (cached.some((id) => isReactive(getValue(id, args)))) {
    return () => sub(value, MValRegExp, (_, id) => toValue(getValue(id, args)))
  }
  return sub(value, MValRegExp, (_, id) => getValue(id, args))
}

/**
 * @param {string} id
 * @param {import("jail/dom").Arg[]} args
 * @returns {any}
 */
function getValue(id, args) {
  return id in args ? args[id] : getInjectedValue(id)
}

/**
 * @param {string} id
 * @returns {any}
 */
function getInjectedValue(id) {
  const value = inject(id)
  if (value) {
    return value
  }
  const [mainId, ...keys] = id.split(".")
  const initialValue = inject(mainId)
  if (initialValue == null || keys.length === 0) {
    return
  }
  return keys.reduce((value, key) => value[key], initialValue)
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {string}
 */
export function createTemplateString(strings) {
  let data = "", arg = 0
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `#{${arg++}}`
  }
  data = data + strings[arg]
  data = sub(data, WSAndTabsRegExp, "")
  data = sub(data, ClosingComRegExp, ComponentReplacement[1])
  data = sub(data, TagRegExp, (match) => {
    const isComponent = ComRegExp.test(match)
    let id = 0
    match = sub(match, AtrRegExp, (data, name, val1, val2, val3) => {
      if (isComponent === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)?.[0] || `"`
      const value = sub(val1 || val2 || val3 || "", ArgRegExp, "@{$1}")
      return ` data-__${id++}=${quote}${name} ${value}${quote}`
    })
    if (isComponent) {
      match = sub(match, ComRegExp, ComponentReplacement[0])
    } else if (DataRegExp.test(match)) {
      match = sub(match, TagRegExp, AttributeReplacement)
    }
    return sub(match, ArgRegExp, "")
  })
  data = sub(data, ArgRegExp, InsertionReplacement)
  return data
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {DocumentFragment}
 */
function createTemplate(strings) {
  const template = document.createElement("template")
  template.innerHTML = createTemplateString(strings)
  TemplateCache.set(strings, template.content)
  return template.content
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
function renderAttribute(elt, prop, data) {
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
 * @param {Node[]} nodeArray
 * @param  {...any} elements
 * @returns {Node[]}
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
      const previousNode = nodeArray.at(-1)
      if (previousNode instanceof Text) {
        previousNode.data = previousNode.data + elt
      } else {
        nodeArray.push(new Text(elt + ""))
      }
    } else if (isReactive(elt)) {
      createNodeArray(nodeArray, toValue(elt))
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt)
    }
  }
  return nodeArray
}

/**
 * @param {ChildNode} anchor
 * @param {(ChildNode | null)[] | null} currentNodes
 * @param {(ChildNode | Node)[]} nextNodes
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
 * @param {DOMElement} elt
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
  elt[IfDirectiveSymbol] = elt[IfDirectiveSymbol] || new Text()
  const value = binding.value, target = value ? elt[IfDirectiveSymbol] : elt
  target.replaceWith(value ? elt : elt[IfDirectiveSymbol])
}

/**
 * @param {import("jail/dom").DOMElement} elt
 * @param {import("jail/dom").Binding<(event: Event) => void>} binding
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
 * @param {(match: string, ...matches: (string | undefined)[]) => string} replacer
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
