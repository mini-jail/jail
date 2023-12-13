/// <reference path="./types.d.ts" />
import { createEffect, createRoot } from "space/signal"
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
 * @param {space.DOMDocumentFragment} fragment
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 * @returns {space.RenderResult}
 */
function createRenderResult(fragment, template, slots) {
  fragment.querySelectorAll(`[${template.hash}]`)
    .forEach((elt) => renderElement(elt, template, slots))
  const children = fragment.childNodes
  switch (children.length) {
    case 0:
      return
    case 1:
      return children[0]
    default:
      return Array.from(children)
  }
}

/**
 * @param {space.DOMElement} elt
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
 * @param {space.DOMElement} elt
 * @param {space.ComponentData} data
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 * @returns {object}
 */
function createProps(elt, data, template, slots) {
  const props = {
    children: data.selfClosing
      ? undefined
      : createRoot(() => createRenderResult(elt.content, template, slots)),
  }
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
 * @param {space.DOMElement} elt
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
    createEffect(() => namespace(elt, resolve(arg), resolve(value)))
  } else if (isResolvable(value)) {
    createEffect((currentValue) => {
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
  if (attribute.value === null) {
    return
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
  if (elements.length > 0) {
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
  }
  return nodeArray
}

/**
 * @param {space.DOMElement} targetElt
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
    mount(targetElt, child)
  } else if (Symbol.iterator in child) {
    const iterableChild = Array.isArray(child) ? child : Array.from(child)
    if (iterableChild.length === 0) {
      targetElt.remove()
    } else if (iterableChild.length === 1) {
      renderChild(targetElt, iterableChild[0])
    } else if (iterableChild.some(isResolvable)) {
      mount(targetElt, () => iterableChild)
    } else {
      targetElt.replaceWith(...createNodeArray([], ...iterableChild))
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
 * @overload
 * @param {Element} rootElement
 * @param {space.RootComponent} rootComponent
 * @returns {space.Cleanup}
 */
/**
 * @overload
 * @param {Element} rootElement
 * @param {space.Slot[]} slots
 * @returns {space.Cleanup}
 */
/**
 * @param {any} rootElement
 * @param {any} children
 * @returns {space.Cleanup}
 */
export function mount(rootElement, children) {
  const isTemplate = rootElement.tagName === "TEMPLATE"
  const target = isTemplate ? rootElement.parentElement : rootElement
  return createEffect((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(children))
    reconcile(target, currentNodes, nextNodes)
    return nextNodes
  }, [isTemplate ? rootElement : new Comment()])
}

/**
 * @param {Element} rootElement
 * @param {(ChildNode & { data?: string })[]} currentNodes
 * @param {(Node & { data?: string })[]} nextNodes
 */
export function reconcile(rootElement, currentNodes, nextNodes) {
  const anchor = currentNodes.at(-1)?.nextSibling ?? null
  nextNodes.forEach((nextNode, i) => {
    const child = currentNodes[i]
    currentNodes.some((currentNode, j) => {
      if (nextNode.nodeType === 3 && currentNode.nodeType === 3) {
        currentNode.data = nextNode.data
      }
      if (nextNode.isEqualNode(currentNode)) {
        nextNodes[i] = currentNode
        currentNodes.splice(j, 1)
        return true
      }
    })
    if (nextNodes[i] !== child) {
      rootElement.insertBefore(nextNodes[i], child?.nextSibling ?? anchor)
    }
  })
  while (currentNodes.length) {
    currentNodes.pop()?.remove()
  }
}
