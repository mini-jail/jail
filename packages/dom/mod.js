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

const Atr = "__a__"
const Ins = "__i__"
const Com = "__c__"
/** @type {`slot[${Ins}]`} */
const insertionQuery = `slot[${Ins}]`
const attributeQuery = `[${Atr}]`
/** @type {`template[${Com}]`} */
const componentQuery = `template[${Com}]`
const DirPrefix = "d-"
const DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${replace.call(DirPrefix, "-", "\\-")}[^"'<>=\\s]`)
const DirKeyRegExp = /[a-z\-\_]+/
const ArgRegExp = /{{(\d+)}}/g
const SValRegExp = /^{(\d+)}$/
const MValRegExp = /{(\d+)}/g
const BindingModRegExp = /\.(?:[^"'.])+/g
const BindingArgRegExp = /:([^"'<>.]+)/
const WSAndTabsRegExp = /^[\s\t]+/gm
const MultiWSRegExp = /\s+/g
const QuoteRegExp = /["']/
const RemainLastAttr = RegExp(` ${Atr}(?=.* ${Atr})`, "g")
const ComRegExp = /^<((?:[A-Z][a-z]+)+)/
const ClosingComRegExp = /<\/((?:[A-Z][a-z]+)+)>/g
const TagRegExp = /<[a-zA-Z\-]+(?:"[^"]*"|'[^']*'|[^'">])*>/g
const AtrRegExp =
  /\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g
/** @type {Map<TemplateStringsArray, jail.Fragment>} */
const TemplateCache = new Map()
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
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  const fragment = template.cloneNode(true)
  render(fragment, args)
  return fragment
}

/**
 * @param {jail.Fragment} fragment
 * @param {unknown[]} args
 */
function renderAttributes(fragment, args) {
  for (const elt of fragment.querySelectorAll(attributeQuery)) {
    elt.removeAttribute(Atr)
    for (const key in elt.dataset) {
      if (key.startsWith("__")) {
        insertAttribute(elt, ...getPropAndValue(elt, key, args))
      }
    }
  }
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
 * @param {jail.Fragment} fragment
 * @param {unknown[]} args
 */
function renderComponents(fragment, args) {
  for (const elt of fragment.querySelectorAll(componentQuery)) {
    const component = inject(App).components[elt.getAttribute(Com)]
    if (component === undefined) {
      elt.remove()
      continue
    }
    createRoot(() => {
      let props = createComponentProps(elt, args)
      if (elt.content.hasChildNodes()) {
        render(elt.content, args)
        props = props || {}
        props.children = [...elt.content.childNodes]
      }
      insertChild(elt, component(props))
    })
  }
}

/**
 * @param {jail.Fragment} fragment
 * @param {unknown[]} args
 */
function render(fragment, args) {
  for (const elt of fragment.querySelectorAll(insertionQuery)) {
    insertChild(elt, args[elt.getAttribute(Ins)])
  }
  renderAttributes(fragment, args)
  renderComponents(fragment, args)
}

/**
 * @param {HTMLTemplateElement} elt
 * @param {unknown[]} args
 * @returns {object | null}
 */
function createComponentProps(elt, args) {
  let props = null
  for (const key in elt.dataset) {
    const propValueTuple = getPropAndValue(elt, key, args)
    props = props || {}
    props[propValueTuple[0]] = propValueTuple[1]
  }
  return props
}

/**
 * @param {string} value
 * @param {unknown[]} args
 * @returns {unknown | (() => unknown)}
 */
function createValue(value, args) {
  const arg = value.match(SValRegExp)?.[1]
  if (arg) {
    return args[arg]
  }
  for (const [_match, arg] of value.matchAll(MValRegExp)) {
    if (isReactive(args[arg])) {
      return replace.bind(value, MValRegExp, (_, arg) => toValue(args[arg]))
    }
  }
  return replace.call(value, MValRegExp, (_, arg) => args[arg])
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {string}
 */
export function createTemplateString(strings) {
  let data = "", arg = 0
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `{{${arg++}}}`
  }
  data = data + strings[arg]
  data = replace.call(data, WSAndTabsRegExp, "").trim()
  data = replace.call(data, ClosingComRegExp, "</template>")
  data = replace.call(data, TagRegExp, (match) => {
    const isComponent = ComRegExp.test(match),
      type = isComponent ? "" : " " + Atr
    let id = 0
    match = replace.call(match, AtrRegExp, (data, name, val, val2, name2) => {
      if (isComponent === false) {
        if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
          return data
        }
      }
      const quote = data.match(QuoteRegExp)[0]
      val = val || val2
      name = name || name2
      val = val ? " " + replace.call(val, ArgRegExp, "{$1}").trim() : ""
      return ` data-__${id++}=${quote}${name}${val}${quote}${type}`
    })
    if (isComponent) {
      match = replace.call(match, ComRegExp, `<template ${Com}="$1"`)
    }
    match = replace.call(match, RemainLastAttr, "")
    match = replace.call(match, ArgRegExp, "")
    return replace.call(match, MultiWSRegExp, " ")
  })
  data = replace.call(data, ArgRegExp, `<slot ${Ins}="$1"></slot>`)
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
  } else if (isReactive(value) || (Array.isArray(value) && value.length)) {
    insertDynamicChild(elt, value)
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
