import {
  createComputed,
  createEffect,
  createRoot,
  isResolvable,
  onCleanup,
  resolve,
} from "space/signal"
import { getTree } from "./compiler.js"

const bindingTypes = { ".": "property", ":": "attribute", "@": "event" }
const nameRE = /(?<t>[.:@])?(?<n>[^.:]+)(?::(?<a>[^.:]+))?(?:.(?<m>\S+)*)?/

/**
 * @param {import("./mod.js").Child | import("./mod.js").Child[] | undefined | null} child
 * @param  {any[]} values
 * @param {boolean} svg
 */
function renderDOM(child, values, svg) {
  if (child == null) {
    return
  } else if (Array.isArray(child)) {
    switch (child.length) {
      case 0:
        return
      case 1:
        return renderDOM(child[0], values, svg)
      default:
        return child.map((child) => renderDOM(child, values, svg))
    }
  } else if (typeof child === "string") {
    return child
  } else if (typeof child === "number") {
    const value = values[child]
    if (isResolvableChild(value)) {
      const before = new Text()
      mount(null, () => value, before)
      return before
    }
    return value
  }
  return createElement(child, values, svg)
}

/**
 * @param {import("./mod.js").Tree} tree
 * @param {any[]} values
 * @param {boolean} svg
 */
function createElement(tree, values, svg) {
  const type = typeof tree.type === "number" ? values[tree.type] : tree.type
  if (typeof type === "function") {
    return createRoot(() => createComponent(type, tree, values, svg))
  }
  if (tree.type === "svg") {
    svg = true
  } else if (tree.type === "foreignObject") {
    svg = false
  }
  const elt = svg
    ? document.createElementNS("http://www.w3.org/2000/svg", type)
    : document.createElement(type)
  if (tree.props) {
    setProperties(elt, tree.props, values, svg)
  }
  if (tree.children !== null) {
    if (Array.isArray(tree.children)) {
      for (const child of tree.children) {
        addChild(elt, child, values, svg)
      }
    } else {
      addChild(elt, tree.children, values, svg)
    }
  }
  return elt
}

/**
 * @param {import("./mod.js").Component<any>} component
 * @param {import("./mod.js").Tree} tree
 * @param {any[]} values
 * @param {boolean} svg
 */
function createComponent(component, tree, values, svg) {
  const props = {}, children = []
  if (tree.props) {
    for (const name in tree.props) {
      const type = tree.props[name]
      const value = typeof type === "number" ? values[type] ?? type : type
      if (name === "...") {
        for (const key in value) {
          defineProperty(props, key, value[key])
        }
      } else if (name === "children") {
        children.push(value)
      } else {
        defineProperty(props, name, value)
      }
    }
  }
  if (tree.children !== null) {
    if (Array.isArray(tree.children)) {
      for (const child of tree.children) {
        const result = renderDOM(child, values, svg)
        if (result != null) {
          children.push(result)
        }
      }
    } else {
      const result = renderDOM(tree.children, values, svg)
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
  return component(props)
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
    type: bindingTypes[groups.t] ?? "auto",
    name: groups.n,
    arg: groups.a ?? null,
    modifiers: groups.m?.split(".").reduce((mods, key) => {
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
    if (name === "...") {
      setProperties(elt, value, values, svg)
    } else if (name === "children") {
      addChild(elt, value, values, svg)
    } else {
      const binding = createBinding(name, value)
      if (isResolvable(value)) {
        createEffect(() => setProperty(elt, binding))
      } else {
        setProperty(elt, binding)
      }
    }
  }
}

/**
 * @type {{ [name: string]: (elt: HTMLElement, binding: import("space/dom").Binding<any>) => void }}
 */
const customProperties = {
  style(elt, { arg, value }) {
    if (arg) {
      elt.style[arg] = value ?? null
    } else if (value != null && typeof value === "object") {
      Object.assign(elt.style, value)
    } else {
      elt.style.cssText = value + ""
    }
  },
  textContent(elt, binding) {
    if (elt["__textContent"] === undefined) {
      elt["__textContent"] = new Text()
      elt.prepend(elt["__textContent"])
    }
    elt["__textContent"].data = binding.value + ""
  },
}

/**
 * @param {HTMLElement} elt
 * @param {import("./mod.js").Binding<any>} binding
 */
function setProperty(elt, binding) {
  const { modifiers, name, type, value } = binding
  if (name in customProperties) {
    return customProperties[name](elt, binding)
  }
  if (type === "property") {
    elt[name] = value
    return
  }
  if (type === "attribute") {
    return setOrRemoveAttribute(elt, name, value)
  }
  if (type === "event") {
    let listener = value
    if (modifiers?.stop) {
      const listenerCopy = value
      listener = (event) => {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (modifiers?.prevent) {
      const listenerCopy = value
      listener = (event) => {
        event.preventDefault()
        listenerCopy.call(elt, event)
      }
    }
    return elt.addEventListener(name, listener, {
      capture: modifiers?.capture,
      passive: modifiers?.passive,
      once: modifiers?.once,
    })
  }
  if (name in elt) {
    elt[name] = value
  } else {
    setOrRemoveAttribute(elt, name, value)
  }
}

/**
 * @param {Element} elt
 * @param {string} name
 * @param {any} value
 */
function setOrRemoveAttribute(elt, name, value) {
  if (value != null) {
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
  } else if (typeof child === "number" || typeof child === "string") {
    elt.append(child + "")
  } else if (child instanceof Node) {
    elt.append(child)
  } else if (Symbol.iterator in child) {
    for (const subChild of child) {
      insertChild(elt, subChild)
    }
  } else if (isResolvableChild(child)) {
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
  return createRoot((dispose) => {
    const children = createChildren(code)
    const parentNode = rootElement ?? before?.parentElement
    onCleanup(() => {
      before?.remove()
      children.value?.forEach((child) => child.remove())
    })
    createEffect(() => {
      children.value?.forEach((child) => {
        if (child !== before?.previousSibling) {
          parentNode?.insertBefore(child, before ?? null)
        }
      })
    })
    return dispose
  })
}

/**
 * @param {(Node & { remove(): void })[]} nodeArray
 * @param  {...any} elements
 * @returns {(Node & { remove(): void })[]}
 */
function createNodesFrom(nodeArray, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    } else if (elt instanceof Node) {
      // @ts-expect-error elt has remove()
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (typeof elt === "function") {
      createNodesFrom(nodeArray, elt())
    } else if (Symbol.iterator in elt) {
      createNodesFrom(nodeArray, ...elt)
    } else if (isResolvable(elt)) {
      createNodesFrom(nodeArray, elt.value)
    }
  }
  return nodeArray
}

/**
 * @param {unknown} child
 * @returns {{ readonly value: (Node & { remove(): void })[] | null }}
 */
export function createChildren(child) {
  return createComputed(
    /** @param {any[] | null} currentNodes */ (currentNodes) => {
      const nextNodes = createNodesFrom([], child)
      nextNodes?.forEach((nextNode, i) => {
        currentNodes?.some((currentNode, j) => {
          if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
            currentNode.data = nextNode["data"]
          }
          if (currentNode.isEqualNode(nextNode)) {
            nextNodes[i] = currentNode
            currentNodes.splice(j, 1)
            return true
          }
        })
      })
      while (currentNodes?.length) {
        currentNodes.pop()?.remove()
      }
      return nextNodes
    },
    null,
  )
}

/**
 * @param {any} data
 * @returns {data is (() => any) | { value: any } | any[]}
 */
function isResolvableChild(data) {
  if (data == null) {
    return false
  }
  switch (typeof data) {
    case "function":
      return data.length === 0
    case "object":
      return Symbol.iterator in data || "value" in data
  }
  return false
}
