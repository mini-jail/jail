// deno-lint-ignore-file no-explicit-any
import { Cleanup, createEffect, createRoot } from "jail/signal"
import type {
  AttributeData,
  Component,
  ComponentData,
  DOMElement,
  DOMNode,
  RenderResult,
  RootComponent,
  Slot,
  Template,
} from "../types.d.ts"
import {
  isResolvable,
  resolve,
  setPropertyOrAttribute,
} from "../helpers/mod.ts"
import { placeholderRegExp } from "../regexp/mod.ts"
import { createTemplate } from "../template/mod.ts"
import namespaces from "../namespaces/mod.ts"

function reconcileNodes(
  anchor: DOMNode,
  currentNodes: DOMNode[],
  nextNodes: DOMNode[],
): void {
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
        anchor.parentNode!.insertBefore(
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

function render(template: Template, slots: Slot[]): RenderResult {
  return createRenderResult(
    template.fragment.cloneNode(true) as DocumentFragment,
    template,
    slots,
  )
}

function createRenderResult(
  fragment: DocumentFragment,
  template: Template,
  slots: Slot[],
): RenderResult {
  fragment.querySelectorAll(`[${template.hash}]`)
    .forEach((elt) => renderElement(elt, template, slots))
  return fragment.childNodes.length === 0
    ? undefined
    : fragment.childNodes.length === 1
    ? fragment.childNodes[0]
    : Array.from(fragment.childNodes)
}

function renderElement(
  elt: DOMElement,
  template: Template,
  slots: Slot[],
): void {
  const data = template.data[+elt.getAttribute(template.hash)!]
  if (typeof data === "number") {
    renderChild(elt, slots[data])
  } else if (Array.isArray(data)) {
    elt.removeAttribute(template.hash)
    for (const attribute of data) {
      setElementData(elt, attribute, slots)
    }
  } else {
    renderComponent(elt, template, data, slots)
  }
}

function renderComponent(
  elt: DOMElement,
  template: Template,
  data: ComponentData,
  slots: Slot[],
): void {
  const component = slots[data.slot] as Component<any> | undefined
  if (component === undefined) {
    throw new TypeError(`Component is not a function.`, { cause: component })
  }
  createRoot(() => {
    const props: Record<string, any> = {}
    for (const prop in data.props) {
      const value = data.props[prop]
      props[prop] = typeof value === "number" ? slots[value] : value
    }
    if (data.selfClosing === false) {
      const result = createRenderResult(elt.content, template, slots)
      props.children = props.children ? [props.children, result] : result
    }
    renderChild(elt, component(props))
  })
}

function setElementData(
  elt: DOMElement,
  attribute: AttributeData,
  slots: Slot[],
): void {
  const value = createValue(attribute, slots),
    name = attribute.name
  if (attribute.namespace) {
    const directive = namespaces[attribute.namespace]
    if (directive === undefined) {
      throw new TypeError(`Missing Attribute Namespace "${attribute.namespace}`)
    }
    const arg = typeof name === "string" ? name : slots[name]
    createEffect(() => directive(elt, resolve(arg), resolve(value)))
  } else if (isResolvable(value)) {
    createEffect<unknown>((currentValue) => {
      const nextValue = value()
      if (currentValue !== nextValue) {
        setPropertyOrAttribute(elt, <string> name, nextValue)
      }
      return nextValue
    })
  } else {
    setPropertyOrAttribute(elt, <string> name, value)
  }
}

function createValue(attribute: AttributeData, slots: Slot[]): Slot {
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

function createNodeArray(nodeArray: DOMNode[], ...elements: Slot[]): DOMNode[] {
  if (elements.length > 0) {
    for (const elt of elements) {
      if (elt == null || typeof elt === "boolean") {
        continue
      } else if (elt instanceof Node) {
        nodeArray.push(<DOMNode> elt)
      } else if (typeof elt === "string" || typeof elt === "number") {
        nodeArray.push(new Text(elt + ""))
      } else if (typeof elt === "function") {
        createNodeArray(nodeArray, (<() => any> elt)())
      } else if (Symbol.iterator in elt) {
        createNodeArray(nodeArray, ...<Iterable<Slot>> elt)
      }
    }
  }
  return nodeArray
}

function renderDynamicChild(
  targetElt: DOMElement,
  childElement: Slot,
  replaceElt: boolean,
): void {
  const anchor = new Text()
  replaceElt ? targetElt.replaceWith(anchor) : targetElt.appendChild(anchor)
  createEffect<DOMNode[]>((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, [])
}

function renderChild(targetElt: DOMElement, child: Slot): void {
  if (child == null || typeof child === "boolean") {
    targetElt.remove()
  } else if (child instanceof Node) {
    targetElt.replaceWith(child)
  } else if (typeof child === "string" || typeof child === "number") {
    targetElt.replaceWith(child + "")
  } else if (typeof child === "function") {
    renderDynamicChild(targetElt, child, true)
  } else if (Symbol.iterator in child) {
    const iterableChild = Array.isArray(child)
      ? child
      : Array.from(<Iterable<Slot>> child)
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

export function template(
  templateStringsArray: TemplateStringsArray,
  ...slots: Slot[]
): RenderResult {
  return render(createTemplate(templateStringsArray), slots)
}

export function mount(
  rootElement: DOMElement,
  rootComponent: RootComponent,
): Cleanup {
  return createRoot((cleanup) => {
    renderDynamicChild(rootElement, rootComponent, false)
    return cleanup
  })!
}
