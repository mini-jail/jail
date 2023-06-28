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
import { directives, toKebabCase } from "./helpers.js"

const replace = String.prototype.replace
const Atr = "_atr_"
const Ins = "_ins_"
const InsLength = Ins.length
const DirPrefix = "d-"
const DirPrefixLength = DirPrefix.length
const DirRegExp = RegExp(`${replace.call(DirPrefix, "-", "\\-")}[^"'<>=\\s]`)
const ArgRegExp = /###(\d+)###/g
const SValRegExp = /^@@@(\d+)@@@$/
const MValRegExp = /@@@(\d+)@@@/g
const RemainLastAttr = RegExp(` ${Atr}=""(?=.* ${Atr}="")`, "g")
const TagRegExp = /<[a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*>/g
const AtrRegExp =
  /\s(?:([^"'<>=\s]+)=(?:"([^"]*)"|'([^']*)'))|(?:\s([^"'<>=\s]+))/g
/** @type {Map<TemplateStringsArray, jail.Template>} */
const TemplateCache = new Map()
/** @type {"jail/dom/app"} */
const App = Symbol()

/**
 * @template T, P, R
 * @param {T & jail.Component<P, R>} component
 * @returns {jail.Component<P, R>}
 */
export function component(component) {
  return function Component(...args) {
    return createRoot(() => component(...args))
  }
}

/**
 * @template T
 * @param {string} name
 * @param {jail.Directive<T>} directive
 */
export function directive(name, directive) {
  const directives = inject(App).directives,
    directiveCopy = directives[name]
  directives[name] = directive
  onUnmount(() => directives[name] = directiveCopy)
}

/**
 * @param {jail.DOMElement} rootElement
 * @param {jail.Component} rootComponent
 * @returns {jail.Cleanup}
 */
export function mount(rootElement, rootComponent) {
  return createRoot((cleanup) => {
    provide(App, {
      directives,
      anchor: rootElement.appendChild(new Text()),
      currentNodes: null,
    })
    const app = inject(App)
    createEffect(() => {
      const nextNodes = createNodeArray([], rootComponent())
      reconcileNodes(app.anchor, app.currentNodes, nextNodes)
      app.currentNodes = nextNodes
    })
    onCleanup(() => {
      reconcileNodes(app.anchor, app.currentNodes, [])
      app.anchor.remove()
      app.anchor = null
      app.currentNodes = null
    })
    return cleanup
  })
}

/**
 * @param {TemplateStringsArray} strings
 * @param  {...any} args
 * @returns {DocumentFragment}
 */
export function template(strings, ...args) {
  const template = TemplateCache.get(strings) || createTemplate(strings)
  const fragment = template.fragment.cloneNode(true)
  if (template.hasInsertions) {
    for (const elt of fragment.querySelectorAll(`slot[name^=${Ins}]`)) {
      insertChild(elt, args[elt.name.slice(InsLength)])
    }
  }
  if (template.hasAttributes) {
    for (const elt of fragment.querySelectorAll(`[${Atr}]`)) {
      elt.removeAttribute(Atr)
      for (const key in elt.dataset) {
        if (key.startsWith(Atr) === false) {
          continue
        }
        const value = elt.getAttribute(`data-${key}`)
        const prop = elt.getAttribute(key)
        elt.removeAttribute(`data-${key}`)
        elt.removeAttribute(key)
        insertAttribute(elt, prop, createValue(value, args))
      }
    }
  }
  return fragment
}

/**
 * @param {string} data
 * @param {any[]} args
 * @returns {any | (() => any)}
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
  let data = "", arg = 0, atr = 0
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `###${arg++}###`
  }
  data = data + strings[arg]
  data = replace.call(data, /^[ \t]+/gm, "").trim()
  data = replace.call(data, TagRegExp, (data) => {
    data = replace.call(data, AtrRegExp, (data, name1, val, _, name2) => {
      if (!ArgRegExp.test(data) && !DirRegExp.test(data)) {
        return data
      }
      const prop = name1 || name2
      val = val ? replace.call(val, ArgRegExp, "@@@$1@@@").trim() : ""
      return ` data-${Atr}${atr}="${val}" ${Atr}${atr++}="${prop}" ${Atr}=""`
    })
    data = replace.call(data, RemainLastAttr, "")
    data = replace.call(data, ArgRegExp, `__unknown__$1`)
    return replace.call(data, /\s+/g, " ")
  })
  data = replace.call(data, ArgRegExp, `<slot name="${Ins}$1"></slot>`)
  return data
}

/**
 * @param {TemplateStringsArray} strings
 * @returns {jail.Template}
 */
function createTemplate(strings) {
  const template = document.createElement("template")
  const templateString = createTemplateString(strings)
  template.innerHTML = templateString
  const cacheItem = {
    fragment: template.content,
    hasAttributes: templateString.includes(Atr),
    hasInsertions: templateString.includes(Ins),
  }
  TemplateCache.set(strings, cacheItem)
  return cacheItem
}

/**
 * @param {HTMLSlotElement} slot
 * @param {any} value
 */
function insertChild(slot, value) {
  if (value == null || typeof value === "boolean") {
    slot.remove()
  } else if (value instanceof Node) {
    slot.parentNode.replaceChild(value, slot)
  } else if (isReactive(value) || (Array.isArray(value) && value.length)) {
    const anchor = new Text()
    slot.parentNode.replaceChild(anchor, slot)
    createEffect((currentNodes) => {
      const nextNodes = createNodeArray([], toValue(value))
      reconcileNodes(anchor, currentNodes, nextNodes)
      return nextNodes
    }, null)
  } else {
    slot.parentNode.replaceChild(new Text(String(value)), slot)
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {string} prop
 * @param {any} data
 */
function insertAttribute(elt, prop, data) {
  if (prop.startsWith(DirPrefix)) {
    prop = prop.slice(DirPrefixLength)
    const key = prop.match(/[a-z\-\_]+/)[0]
    const directive = inject(App).directives[key]
    if (directive) {
      createEffect(
        (binding) => (directive(elt, binding), binding),
        createBinding(prop, data),
      )
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
 * @template T
 * @param {string} prop
 * @param {T} rawValue
 * @returns {jail.Binding<T>}
 */
function createBinding(prop, rawValue) {
  let modifiers = null
  const arg = prop.match(/:([^"'<>.]+)/)?.[1] || null
  if (prop.includes(".")) {
    modifiers = {}
    for (const [_match, modifier] of prop.matchAll(/\.([^"'.]+)/g)) {
      modifiers[modifier] = true
    }
  }
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
 * @param {any} value
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
      nodeArray.push(new Text(String(elt)))
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
  next:
  for (let i = 0; i < nextNodes.length; i++) {
    const currentNode = currentNodes[i]
    for (let j = 0; j < currentNodes.length; j++) {
      if (currentNodes[j] === null) {
        continue
      }
      if (bothAreCharacterData(currentNodes[j], nextNodes[i])) {
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
function bothAreCharacterData(node, otherNode) {
  const type = node.nodeType
  return (type === 3 || type === 8) && otherNode.nodeType === type
}
