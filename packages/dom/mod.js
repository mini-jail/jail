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

/**
 * @typedef {HTMLElement | SVGElement} DOMElement
 * @typedef {Node | Node[] | undefined} TemplateResult
 * @typedef {{ readonly [key: string]: boolean }} Modifiers
 * @typedef {{ [prop: string]: any }} Properties
 * @typedef {{ [directive: string]: Directive }} DirectiveMap
 * @typedef {{ [component: string]: Component }} ComponentMap
 * @typedef {{
 *   directives: DirectiveMap
 *   components: ComponentMap
 * }} App
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   readonly value: Type
 *   readonly rawValue: (() => Type) | Type
 *   readonly arg: string | null
 *   readonly modifiers: Modifiers | null
 * }} Binding
 */

/**
 * @template [Type = any]
 * @typedef {(elt: DOMElement, binding: Binding<Type>) => void} Directive
 */

/**
 * @template {Properties} [Type = Properties]
 * @typedef {(props: Type) => any} Component
 */

/**
 * @template Type
 * @typedef {() => Type} RootComponent
 */

const AppInjectionKey = Symbol()
const ATTRIBUTE = "a", INSERTION = "i", COMPONENT = "c"
const TYPE = "__t", VALUE = "__v"
const Query = `[${TYPE}]`
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${DirPrefix.replace("-", "\\-")}[^"'<>=\\s]`)
const DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /#{([^}]+)}/g,
  SValRegExp = /^@{([^}]+)}$/,
  MValRegExp = /@{([^}]+)}/g
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm
const QuoteRegExp = /["']/, DataRegExp = /data\-__\d+/
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/,
  ClosingComRegExp = /<\/((?:[A-Z][a-z]+)+)>/g
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const AtrRegExp =
  /\s([^"'!?<>=\s]+)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^"'<>=\s]+)))?/g
const AttributeDataReplacement = `<$1 ${TYPE}="${ATTRIBUTE}">`
const InsertionReplacement =
  `<slot ${TYPE}="${INSERTION}" ${VALUE}="$1"></slot>`
const ComponentReplacement = [
  `<template ${TYPE}="${COMPONENT}" ${VALUE}="$1"`,
  "</template>",
]
/**
 * @type {Map<TemplateStringsArray, DocumentFragment>}
 */
const TemplateCache = new Map()
/**
 * @type {Map<string, string | string[] | null>}
 */
const ValueCacheMap = new Map()
const DelegatedEvents = Symbol()
const IfDirectiveSymbol = Symbol()
const RegisteredEvents = {}

/**
 * @template Type
 * @param {string} name
 * @param {Directive<Type>} directive
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
 * @template {Properties} Props
 * @param {string} name
 * @param {Component<Props>} component
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
 * @template Type
 * @param {DOMElement} rootElement
 * @param {RootComponent<Type>} rootComponent
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
 * @param  {...any} args
 * @returns {TemplateResult}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  return render(template.cloneNode(true), args)
}

/**
 * @param {DOMElement} elt
 * @param {any[]} args
 */
function renderAttributeType(elt, args) {
  const props = createProps(elt, args)
  for (const key in props) {
    renderAttribute(elt, key, props[key])
  }
}

/**
 * @param {HTMLSlotElement} elt
 * @param {any[]} args
 */
function renderInsertionType(elt, args) {
  const slot = elt.getAttribute(VALUE)
  renderChild(elt, getValue(slot, args))
}

/**
 * @param {HTMLTemplateElement} elt
 * @param {any[]} args
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
 * @param {any[]} args
 * @returns {TemplateResult}
 */
function render(fragment, args) {
  for (const elt of fragment.querySelectorAll(Query)) {
    renderMap[getAndRemoveAttribute(elt, TYPE)]?.(elt, args)
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
 * @param {DOMElement} elt
 * @param {any[]} args
 * @returns {Properties}
 */
function createProps(elt, args) {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith("__")) {
      const data = getAndRemoveAttribute(elt, `data-${key}`),
        prop = data.split(" ", 1)[0]
      props[prop] = createValue(data.slice(prop.length + 1), args)
    }
  }
  return props
}

/**
 * @param {string} value
 * @returns {string | string[] | null}
 */
function getValueCache(value) {
  if (ValueCacheMap.has(value)) {
    return ValueCacheMap.get(value)
  }
  const id = value.match(SValRegExp)?.[1]
  if (id) {
    ValueCacheMap.set(value, id)
    return id
  }
  const matches = [...value.matchAll(MValRegExp)]
  if (matches.length === 0) {
    ValueCacheMap.set(value, null)
    return null
  }
  const ids = matches.map((match) => match[1])
  ValueCacheMap.set(value, ids)
  return ids
}

/**
 * @param {string} value
 * @param {any[]} args
 * @returns {string | (() => string) | any}
 */
function createValue(value, args) {
  const cached = getValueCache(value)
  if (cached === null) {
    return value
  }
  if (typeof cached === "string") {
    return getValue(cached, args)
  }
  if (cached.some((id) => isReactive(getValue(id, args)))) {
    return String.prototype.replace.bind(
      value,
      MValRegExp,
      (_, id) => toValue(getValue(id, args)),
    )
  }
  return String.prototype.replace.call(
    value,
    MValRegExp,
    (_, id) => getValue(id, args),
  )
}

/**
 * @param {string} id
 * @param {any[]} args
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
  data = data.replace(WSAndTabsRegExp, "")
  data = data.replace(ClosingComRegExp, ComponentReplacement[1])
  data = data.replace(TagRegExp, (match) => {
    const isComponent = ComRegExp.test(match)
    let id = 0
    match = match.replace(AtrRegExp, (data, name, val1, val2, val3) => {
      if (isComponent === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)?.[0] || `"`
      const value = (val1 || val2 || val3 || "").replace(ArgRegExp, "@{$1}")
      return ` data-__${id++}=${quote}${name} ${value}${quote}`
    })
    if (isComponent) {
      match = match.replace(ComRegExp, ComponentReplacement[0])
    } else if (DataRegExp.test(match)) {
      match = match.replace(TagRegExp, AttributeDataReplacement)
    }
    return match.replace(ArgRegExp, "")
  })
  data = data.replace(ArgRegExp, InsertionReplacement)
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
 * @param {DOMElement} elt
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
 * @param {DOMElement} elt
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
 * @param {DOMElement} elt
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
 * @template Type
 * @param {string} prop
 * @param {Type} rawValue
 * @returns {Binding<Type>}
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
      nodeArray.push(...Array.from(elt.childNodes))
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
  return data.replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase())
}

/**
 * @param {string} data
 * @returns {string}
 */
function toKebabCase(data) {
  return data.replace(/([A-Z])/g, "-$1").toLowerCase()
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

/**
 * @param {DOMElement} elt
 * @param {string} name
 * @returns {string | null}
 */
function getAndRemoveAttribute(elt, name) {
  const value = elt.getAttribute(name)
  elt.removeAttribute(name)
  return value
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
 * @param {DOMElement} elt
 * @param {Binding<(elt: DOMElement) => void>} binding
 */
function refDirective(elt, binding) {
  binding.rawValue?.(elt)
}

/**
 * @param {DOMElement} elt
 * @param {Binding<string>} binding
 */
function styleDirective(elt, binding) {
  elt.style[binding.arg] = binding.value || null
}

/**
 * @param {DOMElement} elt
 * @param {Binding<any>} binding
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
 * @param {DOMElement} elt
 * @param {Binding<string>} binding
 */
function htmlDirective(elt, binding) {
  elt.innerHTML = binding.value
}

/**
 * @param {DOMElement} elt
 * @param {Binding<string>} binding
 */
function textDirective(elt, binding) {
  elt.textContent = binding.value
}

/**
 * @param {DOMElement} elt
 * @param {Binding<boolean>} binding
 */
function showDirective(elt, binding) {
  elt.style.display = binding.value ? "" : "none"
}

/**
 * @param {DOMElement} elt
 * @param {Binding<boolean>} binding
 */
function ifDirective(elt, binding) {
  elt[IfDirectiveSymbol] = elt[IfDirectiveSymbol] || new Text()
  const value = binding.value, target = value ? elt[IfDirectiveSymbol] : elt
  target.replaceWith(value ? elt : elt[IfDirectiveSymbol])
}

/**
 * @param {DOMElement} elt
 * @param {Binding<(event: Event) => void>} binding
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
