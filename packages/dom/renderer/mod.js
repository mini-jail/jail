/// <reference path="./types.d.ts" />
import { createRenderEffect, createRoot } from "space/signal"
import {
  isResolvable,
  resolve,
  setPropertyOrAttribute,
} from "../helpers/mod.js"
import { placeholderRegExp } from "../regexp/mod.js"
import { createTemplate } from "../template/mod.js"
import namespaces from "../namespaces/mod.js"
import components from "../components/mod.js"

/**
 * @param {space.DocumentFragment} fragment
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 * @returns {space.RenderResult}
 */
function createRenderResult(fragment, template, slots) {
  fragment.querySelectorAll(`[${template.hash}]`)
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
 * @param {space.TemplateElement} elt
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 */
function renderElement(elt, template, slots) {
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
    createRoot(() => {
      const props = component.length
        ? createProps(elt, data, template, slots)
        : undefined
      renderChild(elt, component(props))
    })
  }
}

/**
 * @param {space.TemplateElement} elt
 * @param {space.ComponentData} data
 * @param {space.Template} template
 * @param {space.Slot[]} slots
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
 * @param {space.Element} elt
 * @param {space.AttributeData} attribute
 * @param {space.Slot[]} slots
 */
function setElementData(elt, attribute, slots) {
  const value = createValue(attribute, slots), name = attribute.name
  if (attribute.namespace !== null) {
    /**
     * @type {space.Namespace | undefined}
     */
    // @ts-expect-error: hi ts, i'm sorry
    const namespace = typeof attribute.namespace === "string"
      ? namespaces[attribute.namespace]
      : slots[attribute.namespace]
    if (typeof namespace !== "function") {
      throw new TypeError(`Namespace is not a function!`)
    }
    const arg = typeof name === "string" ? name : slots[name]
    createRenderEffect(() => namespace(elt, resolve(arg), resolve(value)))
  } else if (isResolvable(value)) {
    createRenderEffect((currentValue) => {
      const nextValue = value()
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
 * @param {space.AttributeData} attribute
 * @param {space.Slot[]} slots
 * @returns {space.Slot}
 */
function createValue(attribute, slots) {
  if (typeof attribute.value === "boolean") {
    return attribute.value
  } else if (typeof attribute.value === "number") {
    return slots[attribute.value]
  } else if (attribute.slots === null) {
    return attribute.value
  } else if (attribute.slots.some((slot) => isResolvable(slots[slot]))) {
    return String.prototype.replace.bind(
      attribute.value,
      placeholderRegExp,
      (_match, slot) => resolve(slots[slot]) + "",
    )
  }
  return String.prototype.replace.call(
    attribute.value,
    placeholderRegExp,
    (_match, slot) => slots[slot] + "",
  )
}

/**
 * @param {Node[]} nodeArray
 * @param  {...any} elements
 * @returns {Node[]}
 */
export function createNodeArray(nodeArray, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    } else if (elt instanceof Node) {
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (isResolvable(elt)) {
      createNodeArray(nodeArray, elt())
    } else if (Symbol.iterator in elt) {
      createNodeArray(nodeArray, ...elt)
    }
  }
  return nodeArray
}

/**
 * @param {space.Element} targetElt
 * @param {any} child
 */
function renderChild(targetElt, child) {
  if (child == null || typeof child === "boolean") {
    targetElt.remove()
  } else if (child instanceof Node) {
    targetElt.replaceWith(child)
  } else if (typeof child === "string" || typeof child === "number") {
    targetElt.replaceWith(child + "")
  } else if (isResolvable(child)) {
    const anchor = new Text()
    targetElt.replaceWith(anchor)
    mount(anchor.parentElement, child, anchor)
  } else if (Symbol.iterator in child) {
    const iterableChild = Array.isArray(child) ? child : Array.from(child)
    switch (iterableChild.length) {
      case 0:
        return targetElt.remove()
      case 1:
        return renderChild(targetElt, iterableChild[0])
      default:
        if (iterableChild.some(isResolvable)) {
          const anchor = new Text()
          targetElt.replaceWith(anchor)
          mount(anchor.parentElement, child, anchor)
        } else {
          targetElt.replaceWith(...createNodeArray([], ...iterableChild))
        }
    }
  } else {
    targetElt.replaceWith(String(child))
  }
}

/**
 * @param {TemplateStringsArray} templateStringsArray
 * @param  {...space.Slot} slots
 * @returns {space.RenderResult}
 */
export function template(templateStringsArray, ...slots) {
  const template = createTemplate(templateStringsArray)
  return createRenderResult(
    template.fragment.cloneNode(true),
    template,
    slots,
  )
}

/**
 * @access public
 * @overload
 * @param {Element} rootElement
 * @param {space.Slot} slot
 * @returns {void}
 */
/**
 * @access public
 * @overload
 * @param {Element} rootElement
 * @param {space.Slot} slot
 * @param {ChildNode} anchor
 * @returns {void}
 */
/**
 * @access private
 * @overload
 * @param {Element | null} rootElement
 * @param {space.Slot} slot
 * @param {ChildNode | null} [anchor]
 * @returns {void}
 */
/**
 * @param {Element | null} rootElement
 * @param {space.Slot} slot
 * @param {ChildNode | null} [anchor]
 */
export function mount(rootElement, slot, anchor) {
  // @ts-expect-error: eh
  createRenderEffect((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(slot))
    reconcile(
      rootElement ?? (anchor ?? currentNodes.at(-1))?.parentElement ?? null,
      anchor ?? null,
      currentNodes,
      nextNodes,
    )
    return nextNodes
  }, [])
}

/**
 * @param {ParentNode | null} rootElement
 * @param {ChildNode | null} anchor
 * @param {ChildNode[] | undefined} currentNodes
 * @param {Node[] | undefined} nextNodes
 */
function reconcile(rootElement, anchor, currentNodes, nextNodes) {
  nextNodes?.forEach((nextNode, i) => {
    const child = currentNodes?.[i]
    currentNodes?.some((currentNode, j) => {
      if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
        // @ts-expect-error: Text.data exists here
        currentNode.data = nextNode.data
      } else if (currentNode.nodeType === 8 && nextNode.nodeType === 8) {
        // @ts-expect-error: Comment.data exists here
        currentNode.data = nextNode.data
      }
      if (currentNode.isEqualNode(nextNode)) {
        nextNodes[i] = currentNode
        currentNodes.splice(j, 1)
        return true
      }
      return false
    })
    if (nextNodes[i] !== child) {
      rootElement?.insertBefore(nextNodes[i], child?.nextSibling ?? anchor)
    }
  })
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}
