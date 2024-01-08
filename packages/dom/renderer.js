import { cleanup, effect, resolvable, resolve, root } from "space/signal"
import { setPropertyOrAttribute } from "./helpers.js"
import { placeholderRegExp } from "./regexp.js"
import { createTemplate } from "./template.js"
import namespaces from "./namespaces.js"
import components from "./components.js"

/**
 * @param {DocumentFragment} fragment
 * @param {import("space/dom").Template} template
 * @param {import("space/dom").Slot[]} slots
 * @returns {import("space/dom").DOMResult}
 */
function createRenderResult(fragment, template, slots) {
  fragment.querySelectorAll(`[${template.hash}]`)
    // @ts-ignore: dont worry, small stupid ts
    .forEach((elt) => renderElement(elt, template, slots))
  switch (fragment.childNodes.length) {
    case 0:
      return
    case 1:
      return fragment.childNodes[0]
    default:
      return Array.from(fragment.childNodes)
  }
}

/**
 * @param {import("space/dom").TemplateElement} elt
 * @param {import("space/dom").Template} template
 * @param {import("space/dom").Slot[]} slots
 */
function renderElement(elt, template, slots) {
  /**
   * @type {import("space/dom").TemplateValue}
   */
  // @ts-ignore: will have a value
  const data = template.data[elt.getAttribute(template.hash)]
  if (typeof data === "number") {
    renderChild(elt, slots[data])
  } else if (Array.isArray(data)) {
    elt.removeAttribute(template.hash)
    for (const attribute of data) {
      setElementData(elt, attribute, slots)
    }
  } else {
    const component = typeof data.name === "string"
      ? components[data.name]
      : slots[data.name]
    if (typeof component !== "function") {
      throw new TypeError(`Component is not a function!`)
    }
    root(() => {
      const props = component.length
        ? createProps(elt, data, template, slots)
        : undefined
      // @ts-ignore: mhm sure
      renderChild(elt, component(props))
    })
  }
}

/**
 * @param {import("space/dom").TemplateElement} elt
 * @param {import("space/dom").ComponentData} data
 * @param {import("space/dom").Template} template
 * @param {import("space/dom").Slot[]} slots
 * @returns {object}
 */
function createProps(elt, data, template, slots) {
  const props = { children: createRenderResult(elt.content, template, slots) }
  for (const prop in data.props) {
    const type = data.props[prop]
    let value = typeof type === "number" ? slots[type] : type
    if (prop === "children" && props.children) {
      value = [props.children, value]
    }
    Object.defineProperty(props, prop, {
      get() {
        return resolve(value)
      },
    })
  }
  return props
}

/**
 * @param {import("space/dom").DOMElement} elt
 * @param {import("space/dom").AttributeData} attribute
 * @param {import("space/dom").Slot[]} slots
 */
function setElementData(elt, attribute, slots) {
  const value = createValue(attribute, slots), name = attribute.name
  if (attribute.namespace !== null) {
    /**
     * @type {import("space/dom").Namespace<any, any> | undefined}
     */
    // @ts-expect-error: hi ts, i'm sorry
    const namespace = typeof attribute.namespace === "string"
      ? namespaces[attribute.namespace]
      : slots[attribute.namespace]
    if (typeof namespace !== "function") {
      throw new TypeError(`Namespace is not a function!`)
    }
    const arg = typeof name === "string" ? name : slots[name]
    effect(() => namespace(elt, resolve(arg), resolve(value)))
  } else if (resolvable(value)) {
    effect((currentValue) => {
      const nextValue = value.value
      if (currentValue !== nextValue) {
        // @ts-expect-error: name can be only a string here
        setPropertyOrAttribute(elt, name, nextValue)
      }
      return nextValue
    })
  } else {
    // @ts-expect-error: name can be only a string here... too
    setPropertyOrAttribute(elt, name, value)
  }
}

/**
 * @param {import("space/dom").AttributeData} attribute
 * @param {import("space/dom").Slot[]} slots
 * @returns {import("space/dom").Slot}
 */
function createValue(attribute, slots) {
  if (typeof attribute.value === "boolean") {
    return attribute.value
  } else if (typeof attribute.value === "number") {
    return slots[attribute.value]
  } else if (attribute.slots === null) {
    return attribute.value
  } else if (attribute.slots.some((slot) => resolvable(slots[slot]))) {
    return {
      get value() {
        return String.prototype.replace.call(
          attribute.value,
          placeholderRegExp,
          (_match, slot) => resolve(slots[slot]) + "",
        )
      },
    }
  }
  return String.prototype.replace.call(
    attribute.value,
    placeholderRegExp,
    (_match, slot) => slots[slot] + "",
  )
}

/**
 * @param {import("space/dom").DOMNode[]} nodeArray
 * @param  {...any} elements
 * @returns {import("space/dom").DOMNode[]}
 */
export function createNodeArray(nodeArray, ...elements) {
  elements?.forEach((elt) => {
    if (elt == null || typeof elt === "boolean") {
      return
    } else if (elt instanceof Node) {
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (typeof elt === "function") {
      createNodeArray(nodeArray, elt())
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt)
    } else if (resolvable(elt)) {
      createNodeArray(nodeArray, elt.value)
    }
  })
  return nodeArray
}

/**
 * @param {import("space/dom").DOMElement} targetElt
 * @param {any} child
 */
function renderChild(targetElt, child) {
  if (child == null || typeof child === "boolean") {
    targetElt.remove()
  } else if (child instanceof Node) {
    targetElt.replaceWith(child)
  } else if (typeof child === "string" || typeof child === "number") {
    targetElt.replaceWith(child + "")
  } else if (
    resolvable(child) ||
    Symbol.iterator in child ||
    typeof child === "function"
  ) {
    const anchor = new Text()
    targetElt.replaceWith(anchor)
    mount(null, () => child, anchor)
  } else {
    targetElt.replaceWith(String(child))
  }
}

/**
 * @param {TemplateStringsArray} templateStringsArray
 * @param  {...import("space/dom").Slot} slots
 * @returns {import("space/dom").DOMResult}
 */
export function template(templateStringsArray, ...slots) {
  const template = createTemplate(templateStringsArray)
  return createRenderResult(
    // @ts-ignore: its alright, small one
    template.fragment.cloneNode(true),
    template,
    slots,
  )
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
 * @param {ChildNode} anchor
 * @returns {import("space/signal").Cleanup}
 */
/**
 * @param {Element | null} rootElement
 * @param {() => any} code
 * @param {ChildNode} [anchor]
 */
export function mount(rootElement, code, anchor) {
  return root((dispose) => {
    effect(() => {
      let children = []
      cleanup(() => {
        children.forEach((node) => node.remove())
        anchor?.remove()
      })
      effect(() => {
        const nextNodes = createNodeArray([], code())
        reconcile(
          rootElement ?? anchor?.parentElement ?? null,
          anchor ?? null,
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
 * @param {(ChildNode & { data?: string }) | null} anchor
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
  if (currentNodes?.length) {
    currentNodes.forEach((childNode) => childNode.remove())
  }
}
