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
  if (fragment.childNodes.length === 0) {
    return
  }
  fragment.querySelectorAll(`[${template.hash}]`)
    .forEach((elt) => renderElement(elt, template, slots))
  if (fragment.childNodes.length === 0) {
    return
  } else if (fragment.childNodes.length === 1) {
    return fragment.childNodes[0]
  } else {
    return Array.from(fragment.childNodes)
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
     * @type {space.NamespaceDirective | undefined}
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
 * @param {Element} rootElement
 * @param {space.RootComponent} rootComponent
 */
export function mount(rootElement, rootComponent) {
  createRoot(() => {
    const isPlaceholder = rootElement.tagName === "TEMPLATE"
    /**
     * @type {Node}
     */
    const anchor = isPlaceholder ? rootElement : new Comment()
    /**
     * @type {Element}
     */
    // @ts-expect-error: yes i know
    const target = isPlaceholder ? rootElement.parentElement : rootElement
    createEffect((currentNodes) => {
      const nextNodes = createNodeArray([], resolve(rootComponent))
      reconcileNodeArrays(target, currentNodes, nextNodes)
      return nextNodes
    }, [anchor])
  })
}

/**
 * Modified version of: https://github.com/WebReflection/udomdiff/blob/master/index.js
 * @param {Element} rootElement
 * @param {space.DOMNode[]} current
 * @param {space.DOMNode[]} next
 */
export function reconcileNodeArrays(rootElement, current, next) {
  const anchor = current.at(-1)?.nextSibling ?? null
  let cEnd = current.length,
    nEnd = next.length,
    cStart = 0,
    nStart = 0,
    /**
     * @type {Map<space.DOMNode, number> | null}
     */
    map = null
  while (cStart < cEnd || nStart < nEnd) {
    if (current[cStart] === next[nStart]) {
      cStart++
      nStart++
      continue
    }
    while (current[cEnd - 1] === next[nEnd - 1]) {
      cEnd--
      nEnd--
    }
    if (cEnd === cStart) {
      const childNode = nEnd < next.length
        ? nStart ? next[nStart - 1].nextSibling : next[nEnd - nStart]
        : anchor
      while (nStart < nEnd) {
        rootElement.insertBefore(next[nStart++], childNode)
      }
    } else if (nEnd === nStart) {
      while (cStart < cEnd) {
        if (map === null || map.has(current[cStart]) === false) {
          current[cStart].remove()
        }
        cStart++
      }
    } else if (
      current[cStart] === next[nEnd - 1] &&
      next[nStart] === current[cEnd - 1]
    ) {
      const node = current[--cEnd].nextSibling
      rootElement.insertBefore(next[nStart++], current[cStart++].nextSibling)
      rootElement.insertBefore(next[--nEnd], node)
      current[cEnd] = next[nEnd]
    } else {
      if (map === null) {
        map = new Map()
        let i = nStart
        while (i < nEnd) {
          map.set(next[i], i++)
        }
      }
      const index = map.get(current[cStart])
      if (index !== undefined) {
        if (nStart < index && index < nEnd) {
          let i = cStart, seq = 1
          while (++i < cEnd && i < nEnd) {
            if (map.get(current[i]) !== index + seq) {
              break
            }
            seq++
          }
          if (seq > index - nStart) {
            while (nStart < index) {
              rootElement.insertBefore(next[nStart++], current[cStart])
            }
          } else {
            rootElement.replaceChild(next[nStart++], current[cStart++])
          }
        } else {
          cStart++
        }
      } else {
        current[cStart++].remove()
      }
    }
  }
}
