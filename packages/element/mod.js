import {
  createComputed,
  createEffect,
  createRoot,
  isResolvable,
  onCleanup,
  resolve,
} from "space/signal"
/**
 * @typedef {CapitalizedOnEvents & {
 *   id?: string
 *   className?: string
 *   [name: string]: unknown
 * }} Properties
 */
/**
 * @typedef {{
 *   [name in `on${Capitalize<string>}`]?: (event: Event) => void
 * }} CapitalizedOnEvents
 */
/**
 * @typedef {Element |
 *           Node |
 *           string |
 *           number |
 *           boolean |
 *           null |
 *           undefined |
 *           (() => any) |
 *           { value: any } |
 *           { [Symbol.iterator](): Iterator<any> }
 * } Child
 */
/**
 * @typedef {{
 *   type: string | Component<any, any, any>
 *   props: Properties | null
 *   children: Child | null
 * }} Element
 */
/**
 * @template {{ [key: string]: unknown }} Props
 * @template Children
 * @template Result
 * @callback Component
 * @param {Props} [props]
 * @param {...Children} children
 * @returns {Result}
 */

/**
 * @template {string} TagName
 * @overload
 * @param {TagName} type
 * @param {Properties | null} [props]
 * @param  {...Child} children
 * @returns {Element}
 */
/**
 * @template {Component<any, any, any>} Type
 * @template {Parameters<Type>[0]} Props
 * @template {Parameters<Type>[1][]} Children
 * @overload
 * @param {Type} type
 * @param {Props | null} [props]
 * @param  {...Children} children
 * @returns {Element}
 */
/**
 * @param {any} type
 * @param {any} props
 * @param {...any} children
 * @returns {Element}
 */
export function createElement(type, props, ...children) {
  return {
    type,
    props: props ?? null,
    children: children.length
      ? children.length === 1 ? children[0] : children
      : null,
  }
}

/**
 * @param {Node} parentNode
 * @param {Iterable<Node | Iterable<Node>>} childNodes
 * @returns {void}
 */
function insertChildren(parentNode, childNodes) {
  for (const childNode of childNodes) {
    if (Symbol.iterator in childNode) {
      insertChildren(parentNode, childNode)
      continue
    }
    parentNode.appendChild(childNode)
  }
}

/**
 * @param {HTMLElement} elt
 * @param {Properties} props
 * @returns {void}
 */
function setAttributes(elt, props) {
  for (const prop in props) {
    const value = props[prop]
    if (isResolvable(value)) {
      createEffect(() => setAttribute(elt, prop, value.value, prop in elt))
    } else {
      setAttribute(elt, prop, value, prop in elt)
    }
  }
}

/**
 * @param {HTMLElement} elt
 * @param {string} name
 * @param {any} value
 * @param {boolean} isProp
 * @returns {void}
 */
function setAttribute(elt, name, value, isProp) {
  if (name.startsWith("on")) {
    elt.addEventListener(name.slice(2).toLocaleLowerCase(), value)
  } else if (isProp) {
    elt[name] = value
  } else {
    name = name.replace(/([A-Z])/g, "-$1").toLowerCase()
    if (value != null) {
      elt.setAttribute(name, String(value))
    } else {
      elt.removeAttribute(name)
    }
  }
}

/**
 * @param {Child} child
 * @returns {Iterable<Node>}
 */
function* render(child) {
  if (child == undefined || typeof child === "boolean") {
    return
  }
  if (typeof child === "number" || typeof child === "string") {
    return yield new Text(child + "")
  }
  if (child instanceof Node) {
    return yield child
  }
  if (Symbol.iterator in child) {
    for (const childItem of child) {
      for (const node of render(childItem)) {
        yield node
      }
    }
    return
  }
  if (typeof child === "function") {
    const before = new Comment("render:function")
    mount(null, child, before)
    return yield before
  }
  if (isResolvable(child)) {
    const before = new Comment("render:signal")
    mount(null, () => child.value, before)
    return yield before
  }
  if (typeof child.type === "function") {
    const { type, props, children } = child
    const before = new Comment(`render:${child.type.name ?? "Component"}`)
    const wrappedChildren = Array.isArray(children) ? children : [children]
    mount(null, () => type(props, ...wrappedChildren), before)
    return yield before
  }
  const elt = document.createElement(child.type)
  if (child.props) {
    setAttributes(elt, child.props)
  }
  if (child.children) {
    insertChildren(elt, render(child.children))
  }
  return yield elt
}

/**
 * @param {Child} child
 * @returns {import("space/signal").ReadonlySignal<Node[]>}
 */
export function createChildren(child) {
  return createComputed(/** @param {Node[]} children */ (children) => {
    const nextChildren = Array.from(render(child))
    nextChildren.forEach((nextNode, i) => {
      children.some((currentNode, j) => {
        if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
          currentNode["data"] = nextNode["data"]
        }
        if (currentNode.isEqualNode(nextNode)) {
          nextChildren[i] = currentNode
          children.splice(j, 1)
          return true
        }
      })
    })
    while (children.length) {
      // @ts-expect-error: Nodes have remove method
      children.pop().remove()
    }
    return nextChildren
  }, [])
}

/**
 * @template {{ [name: string]: unknown }} Props
 * @param {Props} props
 * @returns {import("space/signal").ReadonlySignal<{ [Name in keyof Props]?: import("space/signal").Resolved<Props[Name]>}>}
 */
export function createProperties(props) {
  return createComputed(() => {
    return Object.keys(props).reduce((reduced, key) => {
      reduced[key] = resolve(props[key])
      return reduced
    }, {})
  }, {})
}

/**
 * @overload
 * @param {ParentNode} rootElement
 * @param {() => any} code
 * @returns {import("space/signal").Cleanup}
 */
/**
 * @overload
 * @param {null} rootElement
 * @param {() => any} code
 * @param {ChildNode} before
 * @returns {import("space/signal").Cleanup}
 */
/**
 * @overload
 * @param {ParentNode} rootElement
 * @param {() => any} code
 * @param {ChildNode} before
 * @returns {import("space/signal").Cleanup}
 */
/**
 * @param {ParentNode | null} rootElement
 * @param {() => any} code
 * @param {ChildNode} [before]
 */
export function mount(rootElement, code, before) {
  return createRoot((cleanup) => {
    let children = []
    onCleanup(() => {
      before?.remove()
      while (children?.length) {
        children.pop()?.remove()
      }
    })
    createEffect(() => {
      const nextChildren = Array.from(render(code()))
      reconcile(
        rootElement ?? before?.parentElement ?? null,
        before ?? null,
        children,
        nextChildren,
      )
      children = nextChildren
    })
    return cleanup
  })
}

/**
 * @param {ParentNode | null} rootElement
 * @param {ChildNode | null} anchor
 * @param {(ChildNode & { data?: string })[] | undefined} currentNodes
 * @param {(Node & { data?: string })[] | undefined} nextNodes
 * @returns {void}
 */
function reconcile(rootElement, anchor, currentNodes, nextNodes) {
  nextNodes?.forEach((nextNode, i) => {
    const child = currentNodes?.[i]
    currentNodes?.some((currentNode, j) => {
      if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
        currentNode.data = nextNode.data
      }
      if (currentNode.isEqualNode(nextNode)) {
        nextNodes[i] = currentNode
        currentNodes.splice(j, 1)
        return true
      }
    })
    if (nextNodes[i] !== child) {
      rootElement?.insertBefore(nextNodes[i], child?.nextSibling ?? anchor)
    }
  })
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}
