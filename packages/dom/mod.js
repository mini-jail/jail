/// <reference types="./mod.d.ts" />
import {
  createEffect,
  createInjection,
  createRoot,
  inject,
  isReactive,
  nodeRef,
  onCleanup,
  provide,
  toValue,
} from "signal"
import {
  bind,
  cloneNode,
  getAttribute,
  html,
  includes,
  insertBefore,
  isEqualNode,
  match,
  on,
  push,
  query,
  ref,
  removeAttribute,
  replace,
  replaceChild,
  setAttribute,
  show,
  slice,
  startsWith,
  text,
  toKebabCase,
  trim,
} from "./helpers.js"

const prefix = "arg_"
const prefixLength = prefix.length
const ArgRegExp = /{{ (\d+) }}/g
const TagRegExp = /<[a-zA-Z\-](?:"[^"]*"|'[^']*'|[^'">])*>/g
const AttrRegExp = / ([^"'<>\s]+)=["']?{{ (\d+) }}["']?/g
const OnlyLastAttr = RegExp(`( ${prefix})(?=.*[.])`, "g")
const InsertionQuery = `slot[name^=${prefix}]`
const AttributeQuery = `[${prefix}]`
/**
 * @type {Map<TemplateStringsArray, jail.Template>}
 */
const TemplateCache = new Map()
/**
 * @type {jail.Injection<jail.AppInjection | undefined>}
 */
const App = createInjection()

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
  inject(App).directives[name] = directive
}

/**
 * @param {jail.DOMElement} rootElement
 * @param {jail.Component} rootComponent
 * @returns {jail.Cleanup}
 */
export function mount(rootElement, rootComponent) {
  return createRoot((cleanup) => {
    provide(App, {
      node: nodeRef(),
      directives: { ref, bind, html, text, show, on },
      anchor: rootElement.appendChild(new Text()),
      currentNodes: null,
      rootElement,
      rootComponent,
      cleanup,
    })
    const app = inject(App)
    createEffect(() => {
      const nextNodes = createNodeArray([], rootComponent())
      reconcileNodes(app.anchor, app.currentNodes, nextNodes)
      app.currentNodes = nextNodes
    })
    onCleanup(() => {
      reconcileNodes(app.anchor, app.currentNodes, [])
      app.anchor?.remove()
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
  const fragment = cloneNode.call(template.fragment, true)
  if (template.hasInsertions) {
    for (const elt of query.call(fragment, InsertionQuery)) {
      insertChild(elt, args[slice.call(elt.name, prefixLength)])
    }
  }
  if (template.hasAttributes) {
    for (const elt of query.call(fragment, AttributeQuery)) {
      removeAttribute.call(elt, prefix)
      for (const data in elt.dataset) {
        if (startsWith.call(data, prefix) === false) {
          continue
        }
        const prop = getAttribute.call(elt, `data-${data}`)
        removeAttribute.call(elt, `data-${data}`)
        insertAttribute(elt, prop, args[slice.call(data, prefixLength)])
      }
    }
  }
  return fragment
}

/**
 * @param {TemplateStringsArray} strings
 * @returns {jail.Template}
 */
function createTemplate(strings) {
  let hasInsertions = false
  let hasAttributes = false
  let data = "", arg = 0
  while (arg < strings.length - 1) {
    data = data + strings[arg] + `{{ ${arg++} }}`
  }
  data = replace.call(trim.call(data + strings[arg]), /^[ \t]+/gm, "")
  data = replace.call(data, TagRegExp, (data) => {
    data = replace.call(data, /(\s+)/g, " ")
    data = replace.call(data, AttrRegExp, (_match, name, arg) => {
      hasAttributes = true
      return ` data-${prefix + arg}="${name}" ${prefix}`
    })
    return replace.call(data, OnlyLastAttr, "")
  })
  data = replace.call(data, ArgRegExp, (_match, arg) => {
    hasInsertions = true
    return `<slot name="${prefix + arg}"></slot>`
  })
  const template = document.createElement("template")
  template.innerHTML = trim.call(data)
  const cacheItem = {
    fragment: template.content,
    hasAttributes,
    hasInsertions,
  }
  TemplateCache.set(strings, cacheItem)
  return cacheItem
}

/**
 * @param {jail.DOMElement} elt
 * @param {any} value
 */
function insertChild(elt, value) {
  if (value == null || typeof value === "boolean") {
    elt.remove()
  } else if (value instanceof Node) {
    replaceChild.call(elt.parentNode, value, elt)
  } else if (isReactive(value) || (Array.isArray(value) && value.length)) {
    const anchor = new Text()
    replaceChild.call(elt.parentNode, anchor, elt)
    createEffect((currentNodes) => {
      const nextNodes = createNodeArray([], toValue(value))
      reconcileNodes(anchor, currentNodes, nextNodes)
      return nextNodes
    }, null)
  } else {
    replaceChild.call(elt.parentNode, new Text(String(value)), elt)
  }
}

/**
 * @param {jail.DOMElement} elt
 * @param {string} prop
 * @param {any} data
 */
function insertAttribute(elt, prop, data) {
  if (startsWith.call(prop, "d-")) {
    prop = slice.call(prop, 2)
    const key = match.call(prop, /[^:.]+/)[0]
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
  let modifiers = null, arg = null
  if (includes.call(prop, ":")) {
    arg = match.call(prop, /:([^"'<>.]+)/)[1]
  }
  if (includes.call(prop, ".")) {
    for (const key of match.call(prop, /\.([^"'<>.]+)/g)) {
      modifiers = modifiers || {}
      modifiers[slice.call(key, 1)] = true
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
    setAttribute.call(elt, name, String(value))
  } else {
    removeAttribute.call(elt, name)
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
      push.call(nodeArray, ...elt.childNodes)
    } else if (elt instanceof Node) {
      push.call(nodeArray, elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      push.call(nodeArray, new Text(String(elt)))
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
  if (currentNodes === null) {
    for (const nextNode of nextNodes) {
      insertBefore.call(anchor.parentNode, nextNode, anchor)
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
      } else if (isEqualNode.call(currentNodes[j], nextNodes[i])) {
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
    insertBefore.call(
      anchor.parentNode,
      nextNodes[i],
      currentNode?.nextSibling || anchor,
    )
  }
  while (currentNodes?.length) {
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
