import { createEffect, createRoot } from "jail/signal"
import {
  isResolvable,
  resolve,
  setPropertyOrAttribute,
} from "../helpers/mod.js"
import { placeholderRegExp } from "../regexp/mod.js"
import { createTemplate } from "../template/mod.js"
import namespaces from "../namespaces/mod.js"

/**
 * @param {space.Node} anchor
 * @param {space.Node[]} currentNodes
 * @param {space.Node[]} nextNodes
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  if (nextNodes.length > 0) {
    nextNodes.forEach((nextNode, i) => {
      const child = currentNodes[i]
      if (currentNodes.length > 0) {
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
      }
      if (nextNodes[i] !== child) {
        anchor.parentNode?.insertBefore(
          nextNodes[i],
          child?.nextSibling || anchor,
        )
      }
    })
  }
  if (currentNodes.length > 0) {
    currentNodes.forEach((node) => node.remove())
  }
}

/**
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 * @returns {space.RenderResult}
 */
function render(template, slots) {
  return createRenderResult(
    template.fragment.cloneNode(true),
    template,
    slots,
  )
}

/**
 * @param {space.DocumentFragment} fragment
 * @param {space.Template} template
 * @param {space.Slot[]} slots
 * @returns {space.RenderResult}
 */
function createRenderResult(fragment, template, slots) {
  fragment.querySelectorAll(`[${template.hash}]`)
    .forEach((elt) => renderElement(elt, template, slots))
  return fragment.childNodes.length === 0
    ? undefined
    : fragment.childNodes.length === 1
    ? fragment.childNodes[0]
    : Array.from(fragment.childNodes)
}

/**
 * @param {space.Element} elt
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
    const component = slots[data.slot]
    if (typeof component !== "function") {
      throw new TypeError(`Component is not a function.`, { cause: component })
    }
    createRoot(() => {
      const props = {}
      for (const prop in data.props) {
        const value = data.props[prop]
        props[prop] = typeof value === "number" ? slots[value] : value
      }
      if (data.selfClosing === false) {
        const child = createRenderResult(elt.content, template, slots)
        props.children = props.children == null
          ? child
          : [props.children, child]
      }
      // @ts-expect-error: pshhh its ok TS :(
      renderChild(elt, component(props))
    })
  }
}

/**
 * @param {space.Element} elt
 * @param {space.AttributeData} attribute
 * @param {space.Slot[]} slots
 */
function setElementData(elt, attribute, slots) {
  const value = createValue(attribute, slots)
  /**
   * @type {string}
   */
  // @ts-expect-error: this should always be a string. maybe i need more specific AttributeData
  const name = attribute.name
  if (attribute.namespace) {
    const directive = namespaces[attribute.namespace]
    if (directive === undefined) {
      throw new TypeError(`Missing Attribute Namespace "${attribute.namespace}`)
    }
    const arg = typeof name === "string" ? name : slots[name]
    createEffect(() => directive(elt, resolve(arg), resolve(value)))
  } else if (isResolvable(value)) {
    createEffect((currentValue) => {
      const nextValue = value()
      if (currentValue !== nextValue) {
        setPropertyOrAttribute(elt, name, nextValue)
      }
      return nextValue
    })
  } else {
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
 * @returns {space.Node[]}
 */
function createNodeArray(nodeArray, ...elements) {
  if (elements.length > 0) {
    for (const elt of elements) {
      if (elt == null || typeof elt === "boolean") {
        continue
      } else if (elt instanceof Node) {
        nodeArray.push(elt)
      } else if (typeof elt === "string" || typeof elt === "number") {
        nodeArray.push(new Text(elt + ""))
      } else if (typeof elt === "function") {
        createNodeArray(nodeArray, resolve(elt))
      } else if (typeof elt[Symbol.iterator] === "function") {
        createNodeArray(nodeArray, ...elt)
      }
    }
  }
  return nodeArray
}

/**
 * @param {Element} targetElt
 * @param {space.Slot} childElement
 * @param {boolean} replaceElt
 */
function renderDynamicChild(targetElt, childElement, replaceElt) {
  const anchor = new Text()
  /**
   * @type {space.Node[]}
   */
  const currentNodes = []
  replaceElt ? targetElt.replaceWith(anchor) : targetElt.appendChild(anchor)
  createEffect((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, currentNodes)
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
  } else if (typeof child === "function") {
    renderDynamicChild(targetElt, child, true)
  } else if (Symbol.iterator in child) {
    const iterableChild = Array.isArray(child) ? child : Array.from(child)
    if (iterableChild.length === 0) {
      targetElt.remove()
    } else if (iterableChild.length === 1) {
      renderChild(targetElt, iterableChild[0])
    } else if (iterableChild.some((child) => typeof child === "function")) {
      renderDynamicChild(targetElt, iterableChild, true)
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
  return render(createTemplate(templateStringsArray), slots)
}

/**
 * @param {Element} rootElement
 * @param {space.RootComponent} rootComponent
 */
export function mount(rootElement, rootComponent) {
  return createRoot((cleanup) => {
    renderDynamicChild(rootElement, rootComponent, false)
    return cleanup
  })
}
