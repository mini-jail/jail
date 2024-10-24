import { effect, onCleanup, root, State } from "space/signal"
/**
 * @template Element, Type
 * @typedef {(elt: Element, value: Type) => void} Directive
 */
/**
 * @template Type
 * @typedef {?Type | State<?Type> | (() => ?Type)} $
 */
/**
 * @typedef {"prevent" | "stop" | "stopImmediate" | "once"} EventModifier
 */
/**
 * @typedef {[
 *   name: `aria-${string}`,
 *   value: $<string | number | boolean>,
 *   ...args: never[]
 * ]} AriaAttribute
 */
/**
 * @typedef {[
 *   name: `aria${Capitalize<string>}`,
 *   value: $<string | number | boolean>,
 *   ...args: never[]
 * ]} AriaProperty
 */
/**
 * @typedef {[
 *   name: `style:${keyof CSSStyleDeclaration & string}`,
 *   value: $<string>,
 *   ...args: never[]
 * ]} StyleAttribute
 */
/**
 * @typedef {[
 *   name: "children",
 *   child: Child,
 *   ...children: Child[],
 * ]} ChildrenAttribute
 */
/**
 * @typedef {[
 *   name: "id" | "class" | "className" | "slot" | "lang" | "nonce" | "role" | "title",
 *   value: $<string>,
 *   ...args: never[]
 * ]} StringAttribute
 */
/**
 * @typedef {[
 *   name: "hidden" | "inert" | "spellcheck" | "translate",
 *   value: $<boolean | "true" | "false">,
 *   ...args: never[]
 * ]} BooleanAttribute
 */
/**
 * @typedef {[
 *   name: "tabIndex" | "tabindex",
 *   value: $<number | string>,
 *   ...args: never[]
 * ]} NumberAttribute
 */
/**
 * @typedef {[
 *   name: `attr:${string}`,
 *   value: $<object>,
 *   ...args: never[]
 * ]} PrefixedAttribute
 */
/**
 * @typedef {[
 *   name: `prop:${string}`,
 *   value: $<object>,
 *   ...args: never[]
 * ]} PrefixedProperty
 */
/**
 * @template Element
 * @typedef {[
 *   type: `on:${keyof GlobalEventHandlersEventMap}`,
 *   listener: (event: Event & { target: Element }) => void,
 *   ...args: EventModifier[],
 * ]} GlobalEventAttribute
 */
/**
 * @template Element
 * @typedef {[
 *   type: `on:${string}`,
 *   listener: (event: Event & { target: Element }) => void,
 *   ...args: EventModifier[],
 * ]} EventAttribute
 */
/**
 * @template Element, Type
 * @typedef {[
 *   directive: Directive<Element, Type>,
 *   value: Type,
 *   ...args: never[]
 * ]} DirectiveAttribute
 */
/**
 * @typedef {[
 *   name: string,
 *   value: $<object>,
 *   ...args: never[]
 * ]} UnknownAttribute
 */
/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @typedef {StringAttribute |
 *           BooleanAttribute |
 *           NumberAttribute |
 *           AriaAttribute |
 *           AriaProperty |
 *           StyleAttribute |
 *           ChildrenAttribute |
 *           GlobalEventAttribute<HTMLElementTagNameMap[TagName]> |
 *           EventAttribute<HTMLElementTagNameMap[TagName]> |
 *           DirectiveAttribute<HTMLElementTagNameMap[TagName], object> |
 *           PrefixedAttribute |
 *           PrefixedProperty |
 *           UnknownAttribute
 * } Attribute
 */
/**
 * @template Target
 * @typedef {((this: Target, event: Event & { target: Target }) => void) & { [name: string]: boolean }} ModifiedEventListener
 */
/**
 * @typedef {null | ?undefined | string | number | boolean | Node | { value: Child } | (() => Child) | { [Symbol.iterator](): Iterable<Child> }} Child
 */
/**
 * @type {{ [type: string]: true | undefined }}
 */
const listenerMap = {}
/**
 * @type {WeakMap<EventTarget, { [type: string]: Set<ModifiedEventListener<EventTarget>> }>}
 */
const targetListeners = new WeakMap()
/**
 * @param {unknown} value
 */
function resolve(value) {
  if (typeof value === "function") {
    return value()
  }
  return value instanceof State ? value.value : value
}
/**
 * @param {unknown} value
 * @returns {value is (() => any) | State}
 */
function resolvable(value) {
  return value instanceof State ||
    (typeof value === "function" && value.length === 0)
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
      yield* render(...child[Symbol.iterator]())
    } else {
      console.info("unknown child type", child)
    }
  }
}

/**
 * @overload
 * @param {Node} targetNode
 * @param {unknown} child
 * @returns {() => void}
 */
/**
 * @overload
 * @param {Node | null} targetNode
 * @param {unknown} child
 * @param {ChildNode} [before]
 * @returns {() => void}
 */
/**
 * @param {Node | null} targetNode
 * @param {unknown} child
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
 * @param {Attribute<TagName>[]?} [attributes]
 * @param {...Child} children
 * @returns {HTMLElementTagNameMap[TagName]}
 */
/**
 * @template {(...args: any[]) => any} Component
 * @overload
 * @param {Component} component
 * @param {...Parameters<Component>} args
 * @returns {Generator<ChildNode | string>}
 */
/**
 * @param {string | ((...args: any[]) => any)} type
 * @param {...any} args
 */
export function create(type, ...args) {
  if (typeof type === "function") {
    return root(() => render(type(...args)))
  }
  const elt = document.createElement(type)
  if (args.length) {
    assign(elt, ...args)
  }
  return elt
}
/**
 * @param {HTMLElement} elt
 * @param {Attribute<any>[]?} [attributes]
 * @param {...Child} children
 */
function assign(elt, attributes, ...children) {
  if (attributes) {
    for (const [name, value, ...args] of attributes) {
      if (typeof name === "function") {
        effect(() => name(elt, value))
      } else if (name === "children") {
        children.push(value, ...args)
      } else if (name.startsWith("on:")) {
        addListenener(elt, name, /** @type {any} */ (value), args)
      } else if (resolvable(value)) {
        effect(() => setAttribute(elt, name, resolve(value)))
      } else {
        setAttribute(elt, name, value)
      }
    }
  }
  if (children.length) {
    elt.append(...render(...children))
  }
}
/**
 * @param {object} event
 */
function eventListener(event) {
  let target = event.target
  while (target !== null) {
    const listeners = targetListeners.get(target)?.[event.type]
    if (listeners) {
      for (const listener of listeners) {
        try {
          if (listener.prevent) {
            event.preventDefault()
          }
          if (listener.stop) {
            event.stopPropagation()
          }
          if (listener.stopImmediate) {
            event.stopImmediatePropagation()
          }
          listener.call(target, event)
        } catch (error) {
          console.error(listener, error)
        } finally {
          if (listener.once) {
            listeners.delete(listener)
          }
        }
        if (listener.stopImmediate) {
          return
        }
      }
    }
    target = target["parentNode"]
  }
}

/**
 * @param {EventTarget} target
 * @param {string} name
 * @param {ModifiedEventListener<EventTarget>} listener
 * @param {any[] | undefined | null} [args]
 */
function addListenener(target, name, listener, args) {
  const type = name.slice(3)
  let listeners = targetListeners.get(target)
  if (listeners === undefined) {
    targetListeners.set(target, listeners = {})
  }
  if (listeners[type] === undefined) {
    listeners[type] = new Set()
  }
  listeners[type].add(Object.assign(listener, {
    once: hasArg(args, "once"),
    prevent: hasArg(args, "prevent"),
    stop: hasArg(args, "stop"),
    stopImmediate: hasArg(args, "stopImmediate"),
  }))
  if (listenerMap[type] === undefined) {
    listenerMap[type] = true
    addEventListener(type, eventListener)
  }
}
/**
 * @param {HTMLElement} elt
 * @param {string} name
 * @param {any} value
 */
function setAttribute(elt, name, value) {
  if (name.startsWith("style:")) {
    elt.style[name.slice(6)] = value ?? null
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
/**
 * @param {any[] | undefined | null} args
 * @param {any} arg
 */
function hasArg(args, arg) {
  if (args == null) {
    return false
  }
  return args.includes(arg)
}
