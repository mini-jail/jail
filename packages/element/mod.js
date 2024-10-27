import { effect, onCleanup, root } from "space/signal"
/**
 * @template Element
 * @typedef {import("./types.d.ts").HTMLAttributes<Element>} HTMLAttributes
 */
/**
 * @typedef {import("./types.d.ts").Child} Child
 */
/**
 * @template Target, Event
 * @typedef {import("./types.d.ts").DOMEvent<Target, Event>} DOMEvent
 */
/**
 * @template Target, Event
 * @typedef {import("./types.d.ts").DOMEventListener<Target, Event>} DOMEventListener
 */
/**
 * @typedef {import("./types.d.ts").EventOptions} EventOptions
 */
/**
 * @type {{ [type: string]: true | undefined }}
 */
const listenerMap = {}
/**
 * @type {WeakMap<EventTarget, { [type: string]: DOMEventListener<EventTarget, Event> | undefined }>}
 */
const targetListeners = new WeakMap()
/**
 * @param {unknown} value
 */
function resolve(value) {
  return typeof value === "function" ? value() : value
}
/**
 * @param {unknown} value
 * @returns {value is (() => any)}
 */
function resolvable(value) {
  return typeof value === "function" && value.length === 0
}
/**
 * @param  {...Child} children
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
    } else if (resolvable(child)) {
      const before = new Text()
      mount(null, child, before)
      yield before
    } else if (child[Symbol.iterator]) {
      yield* render(...child)
    } else {
      console.info("unknown child type", child)
    }
  }
}
/**
 * @overload
 * @param {Node} targetNode
 * @param {Child} child
 * @returns {() => void}
 */
/**
 * @overload
 * @param {Node | null} targetNode
 * @param {Child} child
 * @param {ChildNode} [before]
 * @returns {() => void}
 */
/**
 * @param {Node | null} targetNode
 * @param {Child} child
 * @param {ChildNode} [before]
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
/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @overload
 * @param {TagName} type
 * @param {HTMLAttributes<HTMLElementTagNameMap[TagName]>?} [attributes]
 * @param {...Child} children
 * @returns {HTMLElementTagNameMap[TagName]}
 */
/**
 * @template {(props: object, ...children: any[]) => any} Component
 * @overload
 * @param {Component} component
 * @param {Parameters<Component>[0]} [attributes]
 * @param {...(Parameters<Component> extends [unknown, ...infer U] ? U : never)[number][]} children
 * @returns {Generator<ChildNode | string>}
 */
/**
 * @param {string | ((props: any, ...children: any[]) => any)} type
 * @param {object?} [attributes]
 * @param {...any} children
 */
export function create(type, attributes, ...children) {
  if (typeof type === "function") {
    return root(() => render(type(attributes, ...children)))
  }
  const elt = document.createElement(type)
  if (attributes) {
    assign(elt, attributes, children)
  }
  if (children.length) {
    elt.append(...render(...children))
  }
  return elt
}
/**
 * @param {HTMLElement} elt
 * @param {HTMLAttributes<HTMLElement>} attributes
 * @param {Child[]} children
 */
function assign(elt, attributes, children) {
  for (const name in attributes) {
    const value = attributes[name]
    if (name === "ref") {
      effect(() => value(elt))
    } else if (name === "children") {
      children.push(value)
    } else if (name.startsWith("on")) {
      const type = name[2] === ":" ? name.slice(3) : name.slice(2).toLowerCase()
      if (Array.isArray(value)) {
        listen(elt, type, value[0], value[1])
      } else {
        listen(elt, type, value)
      }
    } else if (resolvable(value)) {
      effect(() => attribute(elt, name, resolve(value)))
    } else {
      attribute(elt, name, value)
    }
  }
}
/**
 * @param {DOMEvent<EventTarget, object>} event
 */
function eventListener(event) {
  let target = event.target
  while (target !== null) {
    const listeners = targetListeners.get(target),
      listener = listeners?.[event.type]
    if (listener) {
      if (listener.options?.prevent) {
        event.preventDefault()
      }
      if (listener.options?.stop) {
        event.stopPropagation()
      }
      if (listener.options?.stopImmediate) {
        event.stopImmediatePropagation()
      }
      listener(event)
      if (listener.options?.once) {
        listeners[event.type] = undefined
      }
      if (listener.options?.stopImmediate) {
        return
      }
    }
    target = target.parentNode
  }
}

/**
 * @param {EventTarget} target
 * @param {string} name
 * @param {DOMEventListener<EventTarget, Event>} listener
 * @param {EventOptions} [options]
 */
function listen(target, name, listener, options) {
  listener.options = options
  let listeners = targetListeners.get(target)
  if (listeners === undefined) {
    targetListeners.set(target, listeners = {})
  }
  listeners[name] = listener
  if (listenerMap[name] === undefined) {
    listenerMap[name] = true
    document.addEventListener(name, eventListener)
  }
}
/**
 * @param {HTMLElement} elt
 * @param {string} name
 * @param {string?} value
 */
function style(elt, name, value) {
  if (Reflect.has(elt.style, name)) {
    elt.style[name] = value
  } else {
    elt.style.setProperty(name, value)
  }
}
/**
 * @param {HTMLElement} elt
 * @param {string} name
 * @param {any} value
 */
function attribute(elt, name, value) {
  if (name.startsWith("style")) {
    if (typeof value === "string") {
      return style(elt, name[5] === ":" ? name.slice(6) : "cssText", value)
    }
    for (const prop in value) {
      if (resolvable(value[prop])) {
        return effect(() => {
          for (const prop in value) {
            style(elt, prop, resolve(value[prop]))
          }
        })
      } else {
        style(elt, prop, value[prop])
      }
    }
    return
  }
  let isProp = Reflect.has(elt, name)
  if (name.startsWith("attr:")) {
    isProp = false
    name = name.slice(5)
  } else if (name.startsWith("prop:")) {
    isProp = true
    name = name.slice(5)
  }
  if (isProp) {
    elt[name] = value
  } else {
    if (value == null) {
      elt.removeAttribute(name)
    } else {
      elt.setAttribute(name, String(value))
    }
  }
}
