import { Computed, effect, onCleanup, root, State } from "space/signal"
import { getTree } from "./compiler.js"

const bindingTypes = { ".": "property", ":": "attribute", "@": "event" }
const nameRE = /(?<t>[.:@])?(?<n>[^.:]+)(?::(?<a>[^.:]+))?(?:.(?<m>\S+)*)?/

/**
 * @param {import("./mod.js").Child | import("./mod.js").Child[] | undefined | null} child
 * @param  {any[]} values
 * @param {boolean} svg
 * @returns {Generator<ChildNode | string>}
 */
function* renderDOM(child, values, svg) {
  if (child == null) {
    return
  }
  if (typeof child === "string") {
    return yield child
  }
  if (typeof child === "number") {
    if (isResolvable(values[child])) {
      const before = new Text()
      mount(null, values[child], before)
      return yield before
    }
    return yield* render(false, values[child])
  }
  if (Symbol.iterator in child) {
    for (const subChild of child) {
      yield* renderDOM(subChild, values, svg)
    }
    return
  }
  yield* render(false, createElement(child, values, svg))
}

/**
 * @param {import("./mod.js").Tree} tree
 * @param {any[]} values
 * @param {boolean} svg
 */
function createElement(tree, values, svg) {
  const type = typeof tree.type === "number" ? values[tree.type] : tree.type
  if (typeof type === "function") {
    return createComponent(type, tree, values, svg)
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
    elt.append(...renderDOM(tree.children, values, svg))
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
  const children = [], props = { children }
  if (tree.props) {
    for (const name in tree.props) {
      const type = tree.props[name]
      const value = typeof type === "number" ? values[type] ?? type : type
      if (name === "...") {
        for (const key in value) {
          if (key === "children") {
            children.push(...render(false, value))
          } else {
            props[key] = value[key]
          }
        }
      } else if (name === "children") {
        children.push(...render(false, value))
      } else {
        props[name] = value
      }
    }
  }
  if (tree.children !== null) {
    children.push(...renderDOM(tree.children, values, svg))
  }
  return component(props)
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
      return value instanceof State ? value.value : value
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
      elt.append(...renderDOM(value, values, svg))
    } else {
      const binding = createBinding(name, value)
      if (value instanceof State) {
        effect(() => setProperty(elt, binding))
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
 * @param {TemplateStringsArray} statics
 * @param  {...any} values
 * @returns {Generator<ChildNode | string>}
 */
export function html(statics, ...values) {
  return renderDOM(getTree(statics), values, false)
}

/**
 * @param {TemplateStringsArray} statics
 * @param  {...any} values
 * @returns {Generator<ChildNode | string>}
 */
export function svg(statics, ...values) {
  return renderDOM(getTree(statics), values, true)
}

/**
 * @param {boolean} immediate
 * @param  {...any} children
 * @returns {Generator<ChildNode | string>}
 */
export function* render(immediate, ...children) {
  for (const child of children) {
    if (child == null || typeof child === "boolean") {
      continue
    } else if (typeof child === "string" || typeof child === "number") {
      yield child + ""
    } else if (child instanceof Node) {
      yield /** @type {ChildNode} */ (child)
    } else if (isResolvable(child)) {
      if (immediate) {
        yield* render(immediate, resolve(child))
      } else {
        const before = new Text()
        mount(null, child, before)
        yield before
      }
    } else if (Symbol.iterator in child) {
      yield* render(immediate, ...child)
    } else {
      yield String(child)
    }
  }
}
/**
 * @param {Node | undefined | null} targetNode
 * @param {any} child
 * @param {ChildNode | undefined | null} [before]
 */
export function mount(targetNode, child, before) {
  root(() => {
    const children = new Computed(() => {
      const nodes = reconcile(
        targetNode ?? before?.parentElement,
        before,
        children.value,
        Array.from(render(true, child)),
      )
      return nodes
    })
    onCleanup(() => {
      before?.remove()
      children.value?.forEach((child) => child.remove())
    })
  })
}

/**
 * @param {Node | null | undefined} parentNode
 * @param {ChildNode | null | undefined} before
 * @param {ChildNode[] | null | undefined} children
 * @param {(ChildNode | string)[] | null | undefined} nodes
 * @returns {ChildNode[] | null}
 */
function reconcile(parentNode, before, children, nodes) {
  nodes?.forEach((node, i) => {
    const child = children?.[i]
    children?.some((child, j) => {
      let isEqualNode = false
      if (
        child.nodeType === 3 &&
        (typeof node === "string" || node.nodeType === 3)
      ) {
        child["data"] = typeof node === "string" ? node : node["data"]
        isEqualNode = true
      } else if (typeof node !== "string" && child.isEqualNode(node)) {
        isEqualNode = true
      }
      if (isEqualNode) {
        nodes[i] = child
        children.splice(j, 1)
      }
      return isEqualNode
    })
    if (child !== nodes[i]) {
      if (typeof nodes[i] === "string") {
        nodes[i] = new Text(nodes[i])
      }
      parentNode?.insertBefore(nodes[i], child?.nextSibling ?? before ?? null)
    }
  })
  while (children?.length) {
    children.pop()?.remove()
  }
  return nodes?.length ? /** @type {ChildNode[]} */ (nodes) : null
}

/**
 * @param {any} data
 * @returns {data is State | (() => any)}
 */
export function isResolvable(data) {
  return typeof data === "function" || data instanceof State
}

/**
 * @param {any} data
 * @returns {any}
 */
export function resolve(data) {
  return typeof data === "function" ? data() : data?.value ?? data
}
