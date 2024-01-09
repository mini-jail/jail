import {
  cleanup,
  effect,
  resolvable,
  resolve,
  root,
  untrack,
} from "space/signal"
import { getTree } from "./compiler.js"
import { components } from "./components.js"
import { directives } from "./directives.js"

/**
 * @type {Record<string, boolean | undefined>}
 */
const listeners = {}
const nameRE = /(?:d-)?(?<name>[^.:]+)(?::(?<arg>[^.:]+))?(?:.(?<mods>\S+)*)?/

/**
 * @param {import("./mod.js").Child | import("./mod.js").Child[] | undefined | null} node
 * @param  {any[]} values
 * @param {boolean} svg
 */
function renderDOM(node, values, svg) {
  if (node == null) {
    return
  } else if (Array.isArray(node)) {
    switch (node.length) {
      case 0:
        return
      case 1:
        return renderDOM(node[0], values, svg)
      default:
        return node.map((node) => renderDOM(node, values, svg))
    }
  } else if (typeof node === "string") {
    return node
  } else if (typeof node === "number") {
    return values[node]
  }
  return createElement(node, values, svg)
}

/**
 * @param {import("./mod.js").Tree} node
 * @param {any[]} values
 * @param {boolean} svg
 */
function createElement(node, values, svg) {
  const type = typeof node.type === "number" ? values[node.type] : node.type
  if (typeof type === "function" || type in components) {
    const component = typeof type === "function" ? type : components[type]
    return createComponent(component, node, values, svg)
  }
  if (node.type === "svg") {
    svg = true
  } else if (node.type === "foreignObject") {
    svg = false
  }
  const elt = svg
    ? document.createElementNS("http://www.w3.org/2000/svg", type)
    : document.createElement(type)
  if (node.props) {
    setProperties(elt, node.props, values, svg)
  }
  if (node.children !== null) {
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        addChild(elt, child, values, svg)
      }
    } else {
      addChild(elt, node.children, values, svg)
    }
  }
  return elt
}

/**
 * @param {object} nodeProps
 * @param {any[]} values
 * @param {object} props
 * @param {any[]} children
 */
function componentProperties(nodeProps, values, props, children) {
  for (const name in nodeProps) {
    const type = nodeProps[name]
    const value = typeof type === "number" ? values[type] : type
    if (name.startsWith("...")) {
      componentProperties(value, values, props, children)
    } else if (name === "children") {
      children.push(value)
    } else {
      defineProperty(props, name, value)
    }
  }
}

/**
 * @param {import("./mod.js").Component<any>} fn
 * @param {import("./mod.js").Tree} node
 * @param {any[]} values
 * @param {boolean} svg
 */
function createComponent(fn, node, values, svg) {
  const props = {}, children = []
  if (node.props) {
    componentProperties(node.props, values, props, children)
  }
  if (node.children !== null) {
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const result = renderDOM(child, values, svg)
        if (result != null) {
          children.push(result)
        }
      }
    } else {
      const result = renderDOM(node.children, values, svg)
      if (result != null) {
        children.push(result)
      }
    }
  }
  if (children.length) {
    defineProperty(
      props,
      "children",
      children.length === 1 ? children[0] : children,
    )
  }
  return function Component() {
    return fn(props)
  }
}

/**
 * @param {object} props
 * @param {string} name
 * @param {any} value
 */
function defineProperty(props, name, value) {
  Object.defineProperty(props, name, {
    get() {
      return resolve(value)
    },
  })
}

/**
 * @param {string} key
 * @param {any} value
 * @returns {import("./mod.js").Binding<any>}
 */
function createBinding(key, value) {
  const groups = nameRE.exec(key)?.groups
  if (!groups) {
    throw new TypeError(`"${key}" does't match "${nameRE}"`)
  }
  return {
    name: groups.name,
    arg: groups.arg || null,
    modifiers: groups.mods?.split(".").reduce((mods, key) => {
      mods[key] = true
      return mods
    }, {}) ?? null,
    get value() {
      return resolve(value)
    },
  }
}

/**
 * @param {HTMLElement} elt
 * @param {Record<string, string | number | boolean>} props
 * @param {any[]} values
 * @param {boolean} svg
 */
function setProperties(elt, props, values, svg) {
  for (const name in props) {
    const type = props[name]
    const value = typeof type === "number" ? values[type] : type
    if (name.startsWith("...")) {
      setProperties(elt, value, values, svg)
    } else if (name === "children") {
      addChild(elt, value, values, svg)
    } else {
      const binding = createBinding(name, value)
      if (name.startsWith("d-")) {
        const directive = directives[binding.name]
        if (directive === undefined) {
          throw new Error(`Directive d-${binding.name} not found.`)
        }
        effect(() => directive(elt, binding))
      } else if (resolvable(value)) {
        effect(() => setAttribute(elt, binding))
      } else {
        setAttribute(elt, binding)
      }
    }
  }
}

/**
 * @param {Element} elt
 *
 * @param {import("./mod.js").Binding<any>} binding
 */
function setAttribute(elt, binding) {
  let name = binding.name, isProp = name in elt
  const value = binding.value
  if (name.startsWith("on")) {
    name = name.slice(2).toLowerCase()
    const eventOptions = {}, bindOptions = {}
    if (binding.modifiers) {
      const { capture, passive, once, prevent, stop } = binding.modifiers
      bindOptions.once = once
      bindOptions.prevent = prevent
      bindOptions.stop = stop
      eventOptions.capture = capture
      eventOptions.passive = passive
    }
    elt["__events"] = elt["__events"] ?? {}
    elt["__events"][name] = value
    const id = JSON.stringify({ name, eventOptions })
    if (listeners[id] === undefined) {
      listeners[id] = true
      addEventListener(
        name,
        eventListener.bind(bindOptions),
        eventOptions,
      )
    }
    return
  }
  if (binding.modifiers?.prop) {
    isProp = true
  }
  if (binding.modifiers?.attr) {
    isProp = false
  }
  if (binding.modifiers?.camel) {
    name = name.replace(/-([a-z])/g, (_match, str) => str.toUpperCase())
  }
  if (binding.modifiers?.kebab) {
    name = name.replace(/([A-Z])/g, "-$1").toLowerCase()
  }
  if (isProp) {
    elt[name] = value
  } else if (value != null) {
    elt.setAttribute(name, String(value))
  } else {
    elt.removeAttribute(name)
  }
}

/**
 * @param {Element} elt
 * @param {import("./mod.js").Child} child
 * @param {any[]} values
 * @param {boolean} svg
 */
function addChild(elt, child, values, svg) {
  if (typeof child === "string") {
    elt.append(child)
  } else if (typeof child === "number") {
    insertChild(elt, values[child])
  } else {
    insertChild(elt, renderDOM(child, values, svg))
  }
}

/**
 * @param {Element} elt
 * @param  {any} child
 */
function insertChild(elt, child) {
  if (child == null || typeof child === "boolean") {
    return
  }
  if (typeof child === "number" || typeof child === "string") {
    elt.append(child + "")
  } else if (child instanceof Node) {
    elt.append(child)
  } else if (Symbol.iterator in child) {
    for (const subChild of child) {
      insertChild(elt, subChild)
    }
  } else if (resolvable(child) || typeof child === "function") {
    mount(elt, () => child, elt.appendChild(new Text()))
  } else {
    elt.append(String(child))
  }
}

/**
 * @param {TemplateStringsArray} statics
 * @param  {...any} values
 */
export function html(statics, ...values) {
  return renderDOM(getTree(statics), values, false)
}

/**
 * @param {TemplateStringsArray} statics
 * @param  {...any} values
 */
export function svg(statics, ...values) {
  return renderDOM(getTree(statics), values, true)
}

/**
 * This is what most *users* would do.
 * @overload
 * @param {Element} rootElement
 * @param {() => any} code
 * @returns {import("space/signal").Cleanup}
 */
/**
 * This is what some *devs* might want.
 * @overload
 * @param {null} rootElement
 * @param {() => any} code
 * @param {ChildNode} before
 * @returns {import("space/signal").Cleanup}
 */
/**
 * This is what some *devs* might want.
 * @overload
 * @param {Element} rootElement
 * @param {() => any} code
 * @param {ChildNode} before
 * @returns {import("space/signal").Cleanup}
 */
/**
 * @param {Element | null} rootElement
 * @param {() => any} code
 * @param {ChildNode} [before]
 */
export function mount(rootElement, code, before) {
  return root((dispose) => {
    let children = []
    effect(() => {
      cleanup(() => {
        before?.remove()
        while (children.length) {
          children.pop()?.remove()
        }
      })
      effect(() => {
        const nextNodes = nodesFrom([], code())
        reconcile(
          rootElement ?? before?.parentElement ?? null,
          before ?? null,
          children,
          nextNodes,
        )
        children = nextNodes
      })
    })
    return dispose
  })
}

/**
 * @param {ParentNode | null} rootElement
 * @param {ChildNode | null} anchor
 * @param {(ChildNode & { data?: string })[] | undefined} currentNodes
 * @param {(Node & { data?: string })[] | undefined} nextNodes
 */
function reconcile(rootElement, anchor, currentNodes, nextNodes) {
  if (nextNodes?.length) {
    nextNodes?.forEach((nextNode, i) => {
      const child = currentNodes?.[i]
      if (currentNodes?.length) {
        currentNodes.some((currentNode, j) => {
          if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
            currentNode.data = nextNode.data
          } else if (currentNode.nodeType === 8 && nextNode.nodeType === 8) {
            currentNode.data = nextNode.data
          }
          if (currentNode.isEqualNode(nextNode)) {
            nextNodes[i] = currentNode
            currentNodes.splice(j, 1)
            return true
          }
          return false
        })
      }
      if (nextNodes[i] !== child) {
        rootElement?.insertBefore(nextNodes[i], child?.nextSibling ?? anchor)
      }
    })
  }
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}

/**
 * @param {Node[]} array
 * @param  {...any} elements
 * @returns {Node[]}
 */
function nodesFrom(array, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    } else if (elt instanceof Node) {
      array.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      array.push(new Text(elt + ""))
    } else if (typeof elt === "function") {
      nodesFrom(array, elt())
    } else if (Symbol.iterator in elt) {
      nodesFrom(array, ...elt)
    } else if (resolvable(elt)) {
      nodesFrom(array, elt.value)
    }
  }
  return array
}

/**
 * @this {{ stop?: boolean, prevent?: boolean, once?: boolean }}
 * @param {import("./mod.js").DOMEvent<any>} event
 */
function eventListener(event) {
  let elt = event.target
  if (this.stop) {
    event.stopPropagation()
  }
  if (this.prevent) {
    event.preventDefault()
  }
  while (elt !== null) {
    if (elt?.["__events"]?.[event.type]) {
      elt["__events"][event.type].call(elt, event)
      if (this.once) {
        elt["__events"][event.type] = undefined
      }
    }
    elt = elt.parentNode
  }
}
