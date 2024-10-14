import { Computed, createRoot, effect, onCleanup } from "space/signal"
/**
 * @typedef {typeof attrType | typeof propType | typeof onType | typeof styleType} PropType
 */
/**
 * @typedef {{
 *   [style: `${PropName}${typeDelemiter}${styleType}`]: Value<ToString>
 *   [attribute: `${PropName}${typeDelemiter}${attrType}`]: Value<ToString>
 *   [property: `${PropName}${typeDelemiter}${propType}`]: Value<unknown>
 *   [listeners: `${PropName}${typeDelemiter}${onType}`]: EventListener[]
 * }} Properties
 */
/**
 * @typedef {Exclude<string, typeof typeDelemiter>} PropName
 */
/**
 * @typedef {"area" | "base" | "br" | "col" | "embed" | "hr" | "img" | "input" | "link" | "meta" | "param" | "source" | "track" | "wbr"} VoidElements
 */
/**
 * @typedef {{ [Name in `aria${Capitalize<PropName>}`]?: ToString }} AriaProperties
 */
/**
 * @typedef {{ [Name in `aria-${PropName}`]?: ToString }} AriaAttributes
 */
/**
 * @typedef {{ [Name in `data-${PropName}`]?: ToString }} DataAttributes
 */
/**
 * @typedef {{ [name: PropName]: ToString }} GenericAttributes
 */
/**
 * @typedef {{ toString(): string }} ToString
 */
/**
 * @typedef {AriaAttributes & DataAttributes & {
 *   id?: ToString
 *   class?: ToString
 *   contenteditable?: ToString | "plaintext-only" | "inherit"
 *   contextmenu?: ToString
 *   is?: ToString
 *   style?: ToString
 *   tabindex?: ToString
 *   about?: ToString
 *   datatype?: ToString
 *   inlist?: any
 *   prefix?: ToString
 *   property?: ToString
 *   resource?: ToString
 *   typeof?: ToString
 *   itemtype?: ToString
 *   itemid?: ToString
 *   itemref?: ToString
 *   part?: ToString
 *   exportparts?: ToString
 *   inputmode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
 *   translate?: "yes" | "no"
 * }} HTMLAttributes
 */
/**
 * @typedef {{
 *   accessKey?: ToString
 *   popover?: boolean | "manual" | "auto"
 *   spellcheck?: boolean
 *   id?: ToString
 *   className?: ToString
 *   slot?: ToString
 *   lang?: ToString
 *   inert?: boolean
 *   translate?: boolean
 *   dir?: "ltr" | "rtl" | "auto"
 *   style?: { [name in CSSRule]?: string }
 *   hidden?: boolean | "hidden" | "until-found"
 *   draggable?: boolean | "false" | "true"
 *   title?: ToString
 *   contentEditable?: boolean | "plaintext-only" | "inherit"
 *   contextMenu?: ToString
 *   tabIndex?: number | ToString
 *   autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters"
 *   itemProp?: ToString
 *   itemScope?: boolean
 *   itemType?: ToString
 *   itemId?: ToString
 *   itemRef?: ToString
 *   exportParts?: ToString
 *   inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search"
 * }} HTMLProperties
 */
/**
 * @typedef {PropName & keyof CSSStyleDeclaration} CSSRule
 */
/**
 * @typedef {{ value: Child | undefined | null }} StateChild
 */
/**
 * @typedef {{ [Symbol.iterator](): Iterable<Child> }} IterableChild
 */
/**
 * @typedef {(() => Child | undefined | null)} FunctionChild
 */
/**
 * @typedef {{ render(): Child | undefined | null }} RenderableChild
 */
/**
 * @typedef {string | number | Node | Element | StateChild | IterableChild | FunctionChild | RenderableChild} Child
 */
/**
 * @template Type
 * @typedef {Type | null | { value: Type | null }} Value
 */
/**
 * @template {{ [name: string]: any }} Type
 * @typedef {{ [Name in keyof Type]: Value<Type[Name]> }} Values
 */
const typeDelemiter = "@",
  attrType = "attr",
  propType = "prop",
  onType = "on",
  styleType = "style"
/**
 * @template {keyof HTMLElementTagNameMap} TagName
 */
export class Element {
  /** @type {TagName} */
  #tagName
  /** @type {Properties?} */
  #props = null
  /** @type {Child[]?} */
  #children = null
  /**
   * @param {TagName} tagName
   */
  constructor(tagName) {
    this.#tagName = tagName
  }
  /**
   * @template {PropName & keyof GlobalEventHandlersEventMap} Name
   * @overload
   * @param {Name} name
   * @param {((event: GlobalEventHandlersEventMap[Name]) => void)} eventListener
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName} name
   * @param {(event: Event) => void} eventListener
   * @return {this}
   */
  on(name, eventListener) {
    if (this.#props === null) {
      this.#props = {}
    }
    const propName = name + typeDelemiter + onType
    if (this.#props[propName] === undefined) {
      this.#props[propName] = []
    }
    this.#props[propName].push(eventListener)
    return this
  }
  /**
   * @template {PropName & keyof HTMLAttributes} Name
   * @overload
   * @param {Name} name
   * @param {Value<HTMLAttributes[Name]>} value
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName & keyof AriaAttributes} name
   * @param {Value<ToString>} value
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName & keyof DataAttributes} name
   * @param {Value<ToString>} value
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName} name
   * @param {Value<ToString>} value
   * @return {this}
   */
  attribute(name, value) {
    if (this.#props === null) {
      this.#props = {}
    }
    this.#props[name + typeDelemiter + attrType] = value
    return this
  }
  /**
   * @overload
   * @param {Values<HTMLAttributes>} attributes
   * @return {this}
   */
  /**
   * @overload
   * @param {Values<DataAttributes>} attributes
   * @return {this}
   */
  /**
   * @overload
   * @param {Values<GenericAttributes>} attributes
   * @return {this}
   */
  attributes(attributes) {
    for (const name in attributes) {
      this.attribute(name, attributes[name])
    }
    return this
  }
  /**
   * @template {keyof HTMLProperties} Name
   * @overload
   * @param {Name} name
   * @param {Value<HTMLProperties[Name]>} value
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName} name
   * @param {Value<unknown>} value
   * @return {this}
   */
  property(name, value) {
    if (this.#props === null) {
      this.#props = {}
    }
    this.#props[name + typeDelemiter + propType] = value
    return this
  }
  /**
   * @param {Values<HTMLProperties>} properties
   * @return {this}
   */
  properties(properties) {
    for (const name in properties) {
      this.property(name, properties[name])
    }
    return this
  }
  /**
   * @overload
   * @param {CSSRule} name
   * @param {Value<ToString>} value
   * @return {this}
   */
  /**
   * @overload
   * @param {PropName} name
   * @param {Value<ToString>} value
   * @return {this}
   */
  style(name, value) {
    if (this.#props === null) {
      this.#props = {}
    }
    this.#props[name + typeDelemiter + styleType] = value
    return this
  }
  /**
   * @param {Values<{ [Name in CSSRule]?: ToString }>} styles
   * @return {this}
   */
  styles(styles) {
    for (const name in styles) {
      this.style(name, styles[name])
    }
    return this
  }
  /**
   * @param {...(TagName extends VoidElements ? never : Child)} children
   * @return {this}
   */
  add(...children) {
    if (this.#children === null) {
      this.#children = []
    }
    this.#children.push(...children)
    return this
  }
  /**
   * @param {TagName extends VoidElements ? never : TemplateStringsArray} template
   * @param  {...TagName extends VoidElements ? never : unknown} values
   * @returns {this}
   */
  text(template, ...values) {
    return this.add(/** @type {any} */ (text(template, ...values)))
  }
  /**
   * @returns {HTMLElementTagNameMap[TagName]}
   */
  render() {
    console.log(this.#props)
    const elt = document.createElement(this.#tagName)
    let ref = /** @type {WeakRef<HTMLElement>?} */ (new WeakRef(elt))
    if (this.#props) {
      for (const key in this.#props) {
        const [name, type] =
          /** @type {[string, PropType]} */ (key.split(typeDelemiter))
        const value = this.#props[key]
        if (type === onType) {
          elt.addEventListener(name, (event) => {
            value.forEach((listener) => listener(event))
          })
        } else if (isResolvable(value)) {
          effect(() => {
            const eltRef = ref?.deref()
            if (eltRef === undefined) {
              ref = null
              return
            }
            setProperty(eltRef, type, name, value.value)
          })
        } else {
          setProperty(elt, type, name, value)
        }
        this.#props[key] = null
      }
    }
    if (this.#children) {
      elt.append(...this.#children.map(render))
    }
    this.#props = null
    this.#children = null
    return elt
  }
}

/**
 * @template {Exclude<PropType, typeof onType>} Type
 * @param {HTMLElement} elt
 * @param {Type} type
 * @param {string} name
 * @param {any} value
 */
function setProperty(elt, type, name, value) {
  if (type === attrType) {
    if (value == null) {
      elt.removeAttribute(name)
    } else {
      elt.setAttribute(name, String(value))
    }
  } else if (type === propType) {
    elt[name] = value
  } else if (type === styleType) {
    elt.style[name] = value ?? null
  }
}

/**
 * @param {Child} child
 * @returns {Node | string}
 */
function render(child) {
  if (typeof child === "string") {
    return child
  }
  if (typeof child === "number") {
    return child + ""
  }
  if (child instanceof Node) {
    return child
  }
  if (child instanceof Element) {
    return child.render()
  }
  const before = new Text()
  mount(null, () => child, before)
  return before
}

/**
 * @overload
 * @param {Node} targetNode
 * @param {() => Child} child
 * @returns {() => void}
 */
/**
 * @overload
 * @param {undefined | null} targetNode
 * @param {() => Child} child
 * @param {ChildNode} before
 * @returns {() => void}
 */
/**
 * @overload
 * @param {Node | undefined | null} targetNode
 * @param {() => Child} child
 * @param {ChildNode | undefined | null} [before]
 * @returns {() => void}
 */
export function mount(targetNode, child, before) {
  return createRoot((dispose) => {
    const children = createChildren(child)
    onCleanup(() => {
      before?.remove()
      children.value?.forEach((child) => child.remove())
    })
    effect(() => {
      const parent = targetNode ?? before?.parentElement
      children.value?.forEach((child) => {
        parent?.insertBefore(child, before ?? null)
      })
    })
    return dispose
  })
}

/**
 * @param {unknown} child
 * @returns {Computed<ChildNode[] | undefined>}
 */
export function createChildren(child) {
  return new Computed((currentNodes) => {
    const nextNodes = createNodesFrom([], child)
    nextNodes.forEach((nextNode, i) => {
      currentNodes?.some((currentNode, j) => {
        if (currentNode.nodeType === 3 && nextNode.nodeType === 3) {
          currentNode["data"] = nextNode["data"]
        }
        if (currentNode.isEqualNode(nextNode)) {
          nextNodes[i] = currentNode
          currentNodes.splice(j, 1)
          return true
        }
      })
    })
    while (currentNodes?.length) {
      currentNodes.pop()?.remove()
    }
    return nextNodes.length === 0 ? undefined : nextNodes
  })
}

/**
 * @param {ChildNode[]} nodeArray
 * @param  {...any} elements
 * @returns {ChildNode[]}
 */
function createNodesFrom(nodeArray, ...elements) {
  for (const elt of elements) {
    if (elt == null || typeof elt === "boolean") {
      continue
    } else if (elt instanceof Node) {
      nodeArray.push(/** @type {ChildNode} */ (elt))
    } else if (elt instanceof Element) {
      nodeArray.push(elt.render())
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (typeof elt === "function") {
      createNodesFrom(nodeArray, elt())
    } else if (Symbol.iterator in elt) {
      createNodesFrom(nodeArray, ...elt)
    } else if (isResolvable(elt)) {
      createNodesFrom(nodeArray, elt.value)
    } else if (typeof elt?.render === "function") {
      createNodesFrom(nodeArray, elt.render())
    }
  }
  return nodeArray
}

/**
 * @param {any} data
 * @returns {data is { value: any }}
 */
export function isResolvable(data) {
  return data && typeof data === "object" && Reflect.has(data, "value")
}

/**
 * @template Type
 * @param {Type} data
 * @returns {Type extends { value: any } ? Type["value"] : Type}
 */
export function resolve(data) {
  return isResolvable(data) ? data.value : data
}

/**
 * @template {keyof HTMLElementTagNameMap} TagName
 * @overload
 * @param {TagName} tagName
 * @returns {Element<TagName>}
 */
export function createElement(type) {
  return new Element(type)
}

/**
 * @param {TemplateStringsArray} template
 * @param  {...unknown} values
 * @returns {Text}
 */
export function text(template, ...values) {
  const text = new Text()
  let ref = /** @type {WeakRef<Text>?} */ (new WeakRef(text))
  effect(() => {
    const textRef = ref?.deref()
    if (textRef === undefined) {
      ref = null
      return
    }
    textRef.data = template.reduce((result, value, index) => {
      return result + value + (resolve(values[index]) ?? "")
    }, "")
  })
  return text
}
