import { effect, onCleanup, root, State } from "space/signal"
import { getTree } from "./compiler.js"

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
  } else if (typeof child === "string") {
    yield child
  } else if (typeof child === "number") {
    const before = new Text()
    mount(null, values[child], before)
    yield before
  } else if (Symbol.iterator in child) {
    for (const subChild of child) {
      yield* renderDOM(subChild, values, svg)
    }
  } else {
    yield* render(createElement(child, values, svg))
  }
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
  const children = [], props = {}
  if (tree.props) {
    for (const name in tree.props) {
      const type = tree.props[name]
      const value = typeof type === "number" ? values[type] ?? type : type
      if (name === "...") {
        for (const key in value) {
          if (key === "children") {
            children.push(value)
          } else {
            props[key] = value[key]
          }
        }
      } else if (name === "children") {
        children.push(value)
      } else {
        props[name] = value
      }
    }
  }
  if (tree.children !== null) {
    children.push(...renderDOM(tree.children, values, svg))
  }
  return component({
    ...props,
    get children() {
      return Array.from(render(...children))
    },
  })
}

/**
 * @template [Type = any]
 */
class Binding {
  static shortcutTypes = { ".": "property", ":": "attribute", "@": "event" }
  static types = { style: "style" }
  /**
   * @readonly
   * @type {"property" | "attribute" | "style" | "event" | "auto"}
   */
  type
  /**
   * @readonly
   * @type {string}
   */
  name
  /**
   * @readonly
   * @type {string?}
   */
  arg
  /**
   * @private
   * @readonly
   * @type {Type}
   */
  rawValue
  /**
   * @private
   * @readonly
   * @type {string?}
   */
  rawModifiers
  /**
   * @param {string} key
   * @param {Type} value
   */
  constructor(key, value) {
    const groups = nameRE.exec(key)?.groups
    if (!groups) {
      throw new TypeError(`"${key}" does't match "${nameRE}"`)
    }
    this.type = Binding.shortcutTypes[groups.t] ??
      Binding.types[groups.n] ??
      "auto"
    this.name = groups.n
    this.arg = groups.arg ?? null
    this.rawModifiers = groups.m ?? null
    this.rawValue = value
  }
  /**
   * @type {{ [name: string]: true | undefined}?}
   */
  get modifiers() {
    return this.rawModifiers?.split(".").reduce((mods, key) => {
      mods[key] = true
      return mods
    }, {}) ?? null
  }
  get value() {
    return resolve(this.rawValue)
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
      const binding = new Binding(name, value)
      if (value instanceof State) {
        effect(() => setProperty(elt, binding))
      } else {
        setProperty(elt, binding)
      }
    }
  }
}

/**
 * @param {HTMLElement} elt
 * @param {Binding} binding
 */
function setProperty(elt, binding) {
  const { modifiers, name, type, value, arg } = binding
  if (type === "style") {
    if (arg) {
      elt.style[arg] = value ?? null
    } else if (value != null && typeof value === "object") {
      Object.assign(elt.style, value)
    } else {
      elt.style.cssText = value + ""
    }
    return
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
 * @param {unknown} value
 * @returns {value is State | Function}
 */
function isResolvable(value) {
  return value instanceof State ||
    (typeof value === "function" && value.length === 0)
}
/**
 * @param {unknown} value
 */
function resolve(value) {
  if (typeof value === "function" && value.length === 0) {
    return value()
  }
  return value instanceof State ? value.value : value
}
/**
 * @param  {...any} children
 * @returns {Generator<ChildNode | string>}
 */
export function* render(...children) {
  for (const child of children) {
    if (child == null || typeof child === "boolean") {
      continue
    } else if (typeof child === "string" || typeof child === "number") {
      yield child + ""
    } else if (child instanceof Node) {
      yield /** @type {ChildNode} */ (child)
    } else if (isResolvable(child)) {
      const before = new Text()
      mount(null, child, before)
      yield before
    } else if (Symbol.iterator in child) {
      yield* render(...child)
    } else {
      yield String(child)
    }
  }
}
/**
 * @param {Node | undefined | null} targetNode
 * @param {any} child
 * @param {ChildNode | undefined | null} [before]
 * @returns {(() => void) | void}
 */
export function mount(targetNode, child, before) {
  return root((cleanup) => {
    /**
     * @type {ChildNode[]?}
     */
    let children = null
    effect(() => {
      children = reconcile(
        targetNode ?? before?.parentElement ?? null,
        before ?? null,
        children,
        Array.from(render(resolve(child))),
      )
    })
    onCleanup(() => {
      before?.remove()
      while (children?.length) {
        children.pop()?.remove()
      }
      before = null
      children = null
    })
    return cleanup
  })
}
/**
 * @param {Node | null} parentNode
 * @param {ChildNode | null} before
 * @param {ChildNode[] | null} children
 * @param {(ChildNode | string)[] | null} nodes
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
      parentNode?.insertBefore(nodes[i], child?.nextSibling ?? before)
    }
  })
  while (children?.length) {
    children.pop()?.remove()
  }
  return nodes?.length ? /** @type {ChildNode[]} */ (nodes) : null
}
