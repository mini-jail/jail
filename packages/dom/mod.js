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
import { directives, replace, toKebabCase } from "./helpers.js"

const TYPES = {
  ATTRIBUTE: "a",
  INSERTION: "i",
  COMPONENT: "c",
}
const ATTRS = {
  TYPE: "__t",
  VALUE: "__v",
}
const Query = `[${ATTRS.TYPE}]`
const DirPrefix = "d-", DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${replace.call(DirPrefix, "-", "\\-")}[^"'<>=\\s]`)
const DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /#{([\d\w]+)}/g,
  SValRegExp = /^@{([\d\w]+)}$/,
  MValRegExp = /@{([\d\w]+)}/g
const BindingModRegExp = /\.(?:[^"'.])+/g, BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm
const QuoteRegExp = /["']/, DataRegExp = /data\-__\d+/
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/,
  ClosingComRegExp = /<\/((?:[A-Z][a-z]+)+)>/g
const TagRegExp = /<([a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const AtrRegExp =
  /\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g
const AttributeReplacement = ` ${ATTRS.TYPE}="${TYPES.ATTRIBUTE}"`
const InsertionReplacement =
  `<slot ${ATTRS.TYPE}="${TYPES.INSERTION}" ${ATTRS.VALUE}="$1"></slot>`
const ComponentReplacement = [
  `<template ${ATTRS.TYPE}="${TYPES.COMPONENT}" ${ATTRS.VALUE}="$1"`,
  "</template>",
]
/**
 * @type {Map<TemplateStringsArray, jail.Fragment>}
 */
const TemplateCache = new Map()
/**
 * @type {Map<string, string | string[] | null>}
 */
const ValueCacheMap = new Map()
const App = Symbol()

/**
 * @param {keyof jail.AppInjection} key
 * @param {string} name
 * @param {jail.AppInjection[jail.AppInjection]} item
 */
function extendApp(key, name, item) {
  const items = inject(App)[key], copy = items[name]
  items[name] = item
  if (copy) {
    onUnmount(() => items[name] = copy)
  }
}

/**
 * @param {string} name
 * @param {jail.Directive} directive
 */
export function createDirective(name, directive) {
  extendApp("directives", name, directive)
}

/**
 * @param {string} name
 * @param {jail.Component} component
 */
export function createComponent(name, component) {
  extendApp("components", name, component)
}

/**
 * @param {jail.DOMElement} rootElement
 * @param {jail.Component} rootComponent
 * @returns {jail.Cleanup}
 */
export function mount(rootElement, rootComponent) {
  return createRoot((cleanup) => {
    provide(App, { directives, components: {} })
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
 * @param  {...unknown} args
 * @returns {Node | Node[] | undefined}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  return render(template.cloneNode(true), args)
}

/**
 * @param {jail.DOMElement} elt
 * @param {string} key
 * @param {unknown[]} args
 * @returns {[string, unknown]}
 */
function getPropAndValue(elt, key, args) {
  const data = elt.getAttribute(`data-${key}`),
    prop = data.split(" ", 1)[0],
    value = data.slice(prop.length + 1)
  elt.removeAttribute(`data-${key}`)
  return [prop, createValue(value, args)]
}

/**
 * @type {{ [key: string]: (elt: jail.DOMElement, args: unknown[]) => void }}
 */
const insertMap = {
  a(elt, args) {
    const props = createProps(elt, args)
    for (const key in props) {
      insertAttribute(elt, key, props[key])
    }
  },
  i(elt, args) {
    const slotId = elt.getAttribute(ATTRS.VALUE)
    insertChild(elt, getValue(slotId, args))
  },
  c(elt, args) {
    const componentName = elt.getAttribute(ATTRS.VALUE)
    const component = inject(App).components[componentName]
    if (component === undefined) {
      elt.remove()
      return
    }
    createRoot(() => {
      const props = createProps(elt, args)
      if (elt.content.hasChildNodes()) {
        props.children = render(elt.content, args)
      }
      insertChild(elt, component(props))
    })
  },
}

/**
 * @param {jail.Fragment} fragment
 * @param {unknown[]} args
 * @returns {Node | Node[] | undefined}
 */
function render(fragment, args) {
  for (const elt of fragment.querySelectorAll(Query)) {
    const type = elt.getAttribute(ATTRS.TYPE)
    elt.removeAttribute(ATTRS.TYPE)
    insertMap[type](elt, args)
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
 * @param {HTMLTemplateElement} elt
 * @param {unknown[]} args
 * @returns {{ [key: string]: unknown }}
 */
function createProps(elt, args) {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith("__")) {
      const propValueTuple = getPropAndValue(elt, key, args)
      props[propValueTuple[0]] = propValueTuple[1]
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
 * @param {unknown[]} args
 * @returns {unknown | string | (() => string)}
 */
function createValue(value, args) {
  const cache = getValueCache(value)
  if (cache === null) {
    return value
  }
  if (typeof cache === "string") {
    return getValue(cache, args)
  }
  if (cache.some((id) => isReactive(getValue(id, args)))) {
    return attributeValue.bind(value, args)
  }
  return attributeValue.call(value, args)
}

/**
 * @this {string}
 * @param {unknown[]} args
 * @returns {string}
 */
function attributeValue(args) {
  return replace.call(this, MValRegExp, (_, id) => toValue(getValue(id, args)))
}

/**
 * @param {string} id
 * @param {unknown[]} args
 * @returns {unknown}
 */
function getValue(id, args) {
  return id in args ? args[id] : inject(id)
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
  data = replace.call(data, WSAndTabsRegExp, "")
  data = replace.call(data, ClosingComRegExp, ComponentReplacement[1])
  data = replace.call(data, TagRegExp, (match) => {
    const isComponent = ComRegExp.test(match)
    let id = 0
    match = replace.call(match, AtrRegExp, (data, name, val, val2, name2) => {
      if (isComponent === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)[0]
      val = replace.call(val || val2, ArgRegExp, "@{$1}")
      return ` data-__${id++}=${quote}${name || name2} ${val}${quote}`
    })
    if (DataRegExp.test(match)) {
      match = replace.call(match, TagRegExp, `<$1${AttributeReplacement}>`)
    }
    if (isComponent) {
      match = replace.call(match, ComRegExp, ComponentReplacement[0])
    }
    return replace.call(match, ArgRegExp, "")
  })
  data = replace.call(data, ArgRegExp, InsertionReplacement)
  return data
}

/**
 * @param {TemplateStringsArray} strings
 * @returns {jail.Fragment}
 */
function createTemplate(strings) {
  const template = document.createElement("template")
  template.innerHTML = createTemplateString(strings)
  TemplateCache.set(strings, template.content)
  return template.content
}

/**
 * @param {HTMLSlotElement} elt
 * @param {unknown} value
 */
function insertChild(elt, value) {
  if (value == null || typeof value === "boolean") {
    elt.remove()
  } else if (value instanceof Node) {
    elt.replaceWith(value)
  } else if (isReactive(value)) {
    insertDynamicChild(elt, value)
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      elt.remove()
    } else if (value.length === 1) {
      insertChild(elt, value[0])
    } else if (value.some((item) => isReactive(item))) {
      insertDynamicChild(elt, value)
    } else {
      elt.replaceWith(...createNodeArray([], ...value))
    }
  } else {
    elt.replaceWith(value + "")
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {(() => unknown) | unknown[]} childElement
 */
function insertDynamicChild(elt, childElement) {
  const anchor = new Text()
  elt.replaceWith(anchor)
  createEffect((currentNodes) => {
    const nextNodes = createNodeArray([], toValue(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, null)
}

/**
 * @param {jail.DOMElement} elt
 * @param {string} prop
 * @param {unknown} data
 */
function insertAttribute(elt, prop, data) {
  if (prop.startsWith(DirPrefix)) {
    prop = prop.slice(DirPrefixLength)
    const key = prop.match(DirKeyRegExp)[0]
    const directive = inject(App).directives[key]
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
 * @param {unknown} rawValue
 * @returns {jail.Binding}
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
 * @param {jail.DOMElement} elt
 * @param {string} prop
 * @param {unknown} value
 */
function setProperty(elt, prop, value) {
  if (prop in elt) {
    elt[prop] = value
    return
  }
  const name = toKebabCase(prop)
  if (value != null) {
    elt.setAttribute(name, String(value))
  } else {
    elt.removeAttribute(name)
  }
}

/**
 * @param {Node[]} nodeArray
 * @param  {...unknown} elements
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
 * @param {Node[]} nextNodes
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  const parentNode = anchor.parentNode
  if (currentNodes === null) {
    for (const nextNode of nextNodes) {
      parentNode.insertBefore(nextNode, anchor)
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
    parentNode.insertBefore(nextNodes[i], currentNode?.nextSibling || anchor)
  }
  while (currentNodes.length) {
    currentNodes.pop()?.remove()
  }
}

/**
 * @param {Node} node
 * @param {Node} otherNode
 * @returns {boolean}
 */
function sameCharacterDataType(node, otherNode) {
  const type = node.nodeType
  return (type === 3 || type === 8) && otherNode.nodeType === type
}
