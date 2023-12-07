import {
  createEffect,
  createRoot,
  inject,
  onUnmount,
  provide,
} from "jail/signal"

/**
 * @typedef {import("jail/signal").Cleanup} Cleanup
 * @typedef {string | number | boolean | null | undefined | { [property: string | number | symbol]: * } | Node} SlotPrimitive
 * @typedef {SlotPrimitive | Iterable<SlotPrimitive> | (() => SlotPrimitive) | DOMListener<HTMLElement>} Slot
 * @typedef {Node | Node[] | undefined} RenderResult
 * @typedef {{ readonly [key: string]: boolean }} Modifiers
 * @typedef {{ [name: string]: Directive<*> | undefined }} Directives
 * @typedef {{ [name: string]: Component<*> | undefined }} Components
 * @typedef {() => *} RootComponent
 * @typedef {{
 *   directives: Directives
 *   components: Components
 * }} Application
 */
/**
 * @typedef {{
 *   children?: *
 *   [key: string]: *
 * }} Properties
 */
/**
 * @template [Type = *]
 * @typedef {(elt: HTMLElement, binding: Binding<Type>) => void} Directive
 */
/**
 * @template {Properties} [Props = *]
 * @typedef {(props: Props) => *} Component
 */
/**
 * @template [Type = *]
 * @typedef {{
 *   readonly value: Type extends (() => *) ?  ReturnType<Type> : Type
 *   readonly rawValue: Type | (() => Type)
 *   readonly arg: string | null
 *   readonly modifiers: Modifiers | null
 * }} Binding
 */
/**
 * @template {HTMLElement} [Type = HTMLElement]
 * @typedef {Type & EventTarget} DOMEventTarget
 */
/**
 * @template {HTMLElement} [Type = HTMLElement]
 * @typedef {object} DOMEventTargetProperties
 * @property {DOMEventTarget<Type>} target
 * @property {DOMEventTarget<Type>} currentTarget
 */
/**
 * @template {HTMLElement} [Type = HTMLElement]
 * @typedef {DOMEventTargetProperties<Type> &
 *   Event &
 *   UIEvent &
 *   InputEvent &
 *   KeyboardEvent &
 *   FocusEvent &
 *   MouseEvent &
 *   ClipboardEvent &
 *   DragEvent &
 *   FormDataEvent &
 *   SubmitEvent &
 *   TouchEvent &
 *   WheelEvent
 * } DOMEvent
 */
/**
 * @template {HTMLElement} [Type = HTMLElement]
 * @typedef {(this: Type, event: DOMEvent<Type>) => void} DOMListener
 */

const AppInjectionKey = Symbol(),
  ON_DEL_DIR_SYM = Symbol(),
  IF_DIR_SYM = Symbol(),
  HASH = "_" + Math.random().toString(36).slice(2, 7) + "_",
  TYPE = HASH + "type",
  VALUE = HASH + "value",
  QUERY = `[${TYPE}]`,
  DIR_PREFIX = "d-",
  DIR_PREFIX_LENGTH = DIR_PREFIX.length,
  DIR_RE = RegExp(`${replace(DIR_PREFIX, "-", "\\-")}[^"'<>=\\s]`),
  DIR_KEY_RE = /[a-z\-\_]+/,
  ARG_RE = /#{(\d+)}/g,
  SINGLE_VALUE_RE = /^@{(\d+)}$/,
  MULTI_VALUE_RE = /@{(\d+)}/g,
  KEBAB_RE = /-[a-z]/g,
  CAMEL_RE = /([A-Z])/g,
  KEY_VALUE_RE = /^([^\s]+)\s(.*)$/,
  BINDING_MOD_RE = /\.(?:[^"'.])+/g,
  BINDING_ARG_RE = /:([^"'<>.]+)/,
  START_WS_RE = /^[\s]+/gm,
  CONTENT_RE = /^\r\n|\n|\r(>)\s+(<)$/gm,
  COMP_RE = /^<((?:[A-Z][a-z]+)+)/,
  CLOSING_COMP_RE = /<\/(?:[A-Z][a-z]+)+>/g,
  TAG_RE = /<(([a-z\-]+)(?:"[^"]*"|'[^']*'|[^'">])*)>/gi,
  SC_TAG_RE = /<([a-zA-Z-]+)(("[^"]*"|'[^']*'|[^'">])*)\s*\/>/g,
  ATTR_RE =
    /\s([a-z]+[^\s=>"']*)(?:(?:="([^"]*)"|(?:='([^']*)'))|(?:=([^\s=>"']+)))?/gi,
  ATTR_REPLACEMENT = `<$1 ${TYPE}="attr">`,
  SLOT_REPLACEMENT = `<slot ${TYPE}="slot" ${VALUE}="$1"></slot>`,
  COMP_REPLACEMENTS = [`<template ${TYPE}="comp" ${VALUE}="$1"`, "</template>"]

/** @type {Map<TemplateStringsArray, DocumentFragment>} */
const FragmentCache = new Map()
/** @type {{ [value: string]: string | string[] | undefined }} */
const AttrValueCache = {}
/** @type {{ [name: string]: boolean | undefined }} */
const DelegatedEvents = {}

const ERR_MISSING_INJECTION_APP = new Error("Missing App Injection"),
  ERR_MISSING_ATTRIBUTE_VALUE = new Error("Missing Attribute _###_value"),
  ERR_MISSING_COMPONENT = new Error("Missing Component"),
  ERR_MISSING_DIRECTIVE = new Error("Missing Directive"),
  ERR_MISSING_BINDING_ARG = new Error("Missing Binding.arg")

/**
 * @returns {Application}
 */
function injectApp() {
  /** @type {Application | undefined} */
  const app = inject(AppInjectionKey)
  if (app === undefined) {
    throw ERR_MISSING_INJECTION_APP
  }
  return app
}

/**
 * @template Type
 * @param {string} name
 * @param {Directive<Type>} directive
 * @returns {void}
 */
export function createDirective(name, directive) {
  const directives = injectApp().directives
  if (name in directives) {
    const directiveCopy = directives[name]
    onUnmount(() => directives[name] = directiveCopy)
  }
  directives[name] = directive
}

/**
 * @template {Properties} Props
 * @param {string} name
 * @param {Component<Props>} component
 * @returns {void}
 */
export function createComponent(name, component) {
  const components = injectApp().components
  if (name in components) {
    const componentCopy = components[name]
    onUnmount(() => components[name] = componentCopy)
  }
  components[name] = component
}

/**
 * @param {HTMLElement} rootElement
 * @param {RootComponent} rootComponent
 * @returns {Cleanup | undefined}
 */
export function mount(rootElement, rootComponent) {
  return createRoot((cleanup) => {
    provide(AppInjectionKey, {
      directives: {
        on: onDirective,
        ref: refDirective,
        show: showDirective,
        html: htmlDirective,
        text: textDirective,
        style: styleDirective,
        bind: bindDirective,
        if: ifDirective,
      },
      components: {},
    })
    renderDynamicChild(rootElement, rootComponent, false)
    return cleanup
  })
}

/**
 * @param {TemplateStringsArray} templateStrings
 * @param  {...Slot} slots
 * @returns {RenderResult}
 */
export function template(templateStrings, ...slots) {
  return render(createOrGetFragment(templateStrings), slots)
}

const renderMap = {
  /**
   * @param {HTMLElement} elt
   * @param {Slot[]} slots
   */
  attr: (elt, slots) => {
    const props = createProps(elt, slots)
    elt.removeAttribute(TYPE)
    for (const key in props) {
      renderAttr(elt, key, props[key])
    }
  },
  /**
   * @param {HTMLSlotElement} elt
   * @param {Slot[]} slots
   */
  slot: (elt, slots) => {
    const slot = elt.getAttribute(VALUE)
    if (slot === null) {
      throw ERR_MISSING_ATTRIBUTE_VALUE
    }
    renderChild(elt, slots[slot])
  },
  /**
   * @param {HTMLTemplateElement} elt
   * @param {Slot[]} slots
   */
  comp: (elt, slots) => {
    const componentName = elt.getAttribute(VALUE)
    if (componentName === null) {
      throw ERR_MISSING_ATTRIBUTE_VALUE
    }
    const component = injectApp().components[componentName]
    if (component === undefined) {
      throw ERR_MISSING_COMPONENT
    }
    createRoot(() => {
      const props = createProps(elt, slots)
      if (elt.content.hasChildNodes()) {
        props.children = render(elt.content, slots)
      }
      renderChild(elt, component(props))
    })
  },
}

/**
 * @param {DocumentFragment} fragment
 * @param {Slot[]} slots
 * @returns {RenderResult}
 */
function render(fragment, slots) {
  fragment.querySelectorAll(QUERY).forEach((elt) => {
    renderMap[elt.getAttribute(TYPE)](elt, slots)
  })
  if (fragment.childNodes.length === 0) {
    return
  }
  if (fragment.childNodes.length === 1) {
    return fragment.childNodes[0]
  }
  return Array.from(fragment.childNodes)
}

/**
 * @param {HTMLElement} elt
 * @param {Slot[]} slots
 * @returns {Properties}
 */
function createProps(elt, slots) {
  const props = {}
  for (const key in elt.dataset) {
    if (key.startsWith(HASH)) {
      /** @type {RegExpMatchArray} */
      // @ts-expect-error: elt.dataset[key] will be available and match with KEY_VALUE_RE
      const match = elt.dataset[key].match(KEY_VALUE_RE)
      props[match[1]] = createValue(match[2], slots)
      delete elt.dataset[key]
    }
  }
  return props
}

/**
 * @param {string} value
 * @returns {string | string[] | undefined}
 */
function getOrCreateValueCache(value) {
  if (value in AttrValueCache) {
    return AttrValueCache[value]
  }
  const id = value.match(SINGLE_VALUE_RE)?.[1]
  if (id) {
    return AttrValueCache[value] = id
  }
  const matches = [...value.matchAll(MULTI_VALUE_RE)]
  if (matches.length === 0) {
    return AttrValueCache[value] = undefined
  }
  return AttrValueCache[value] = matches.map((match) => match[1])
}

/**
 * @param {string} value
 * @param {Slot[]} slots
 * @returns {string | (() => string) | *}
 */
function createValue(value, slots) {
  const keyOrKeys = getOrCreateValueCache(value)
  if (keyOrKeys === undefined) {
    return value
  }
  if (typeof keyOrKeys === "string") {
    return slots[keyOrKeys]
  }
  if (keyOrKeys.some((key) => typeof slots[key] === "function")) {
    return () => replace(value, MULTI_VALUE_RE, (_, key) => resolve(slots[key]))
  }
  return replace(value, MULTI_VALUE_RE, (_, key) => slots[key])
}

/**
 * @param {TemplateStringsArray | string[]} strings
 * @returns {string}
 */
export function createTemplateString(strings) {
  let templateString = "", arg = 0
  while (arg < strings.length - 1) {
    templateString = templateString + strings[arg] + `#{${arg++}}`
  }
  templateString = templateString + strings[arg]
  templateString = replace(templateString, START_WS_RE, "")
  templateString = replace(templateString, SC_TAG_RE, (match, tag, attr) => {
    return CAMEL_RE.test(tag) ? `<${tag}${attr}></${tag}>` : match
  })
  templateString = replace(
    templateString,
    CLOSING_COMP_RE,
    COMP_REPLACEMENTS[1],
  )
  templateString = replace(templateString, TAG_RE, (match) => {
    const isComp = COMP_RE.test(match)
    let id = 0
    match = replace(match, ATTR_RE, (match, name, val1, val2, val3) => {
      if (isComp === false) {
        if (!ARG_RE.test(match) && !DIR_RE.test(match)) {
          return match
        }
      }
      const value = replace(val1 ?? val2 ?? val3 ?? "", ARG_RE, "@{$1}")
      return ` data-${HASH}${id++}="${name} ${value}"`
    })
    if (isComp) {
      match = replace(match, COMP_RE, COMP_REPLACEMENTS[0])
    } else if (id !== 0) {
      match = replace(match, TAG_RE, ATTR_REPLACEMENT)
    }
    return match
  })
  templateString = replace(templateString, ARG_RE, SLOT_REPLACEMENT)
  templateString = replace(templateString, CONTENT_RE, "$1$2")
  return templateString
}

/**
 * @param {TemplateStringsArray} templateStrings
 * @returns {DocumentFragment}
 */
function createOrGetFragment(templateStrings) {
  let fragment = FragmentCache.get(templateStrings)
  if (fragment === undefined) {
    const elt = document.createElement("template")
    elt.innerHTML = createTemplateString(templateStrings)
    FragmentCache.set(templateStrings, fragment = elt.content)
  }
  // @ts-expect-error: clone of DocumentFragment is still a DocumentFragment
  return fragment.cloneNode(true)
}

/**
 * @param {HTMLElement} targetElt
 * @param {*} child
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
    child = Array.isArray(child) ? child : Array.from(child)
    if (child.length === 0) {
      targetElt.remove()
    } else if (child.length === 1) {
      renderChild(targetElt, child[0])
    } else if (child.some((item) => typeof item === "function")) {
      renderDynamicChild(targetElt, child, true)
    } else {
      targetElt.replaceWith(...createNodeArray([], ...child))
    }
  }
}

/**
 * @param {HTMLElement} elt
 * @param {(() => *) | *[]} childElement
 * @param {boolean} replaceRoot
 */
function renderDynamicChild(elt, childElement, replaceRoot) {
  const anchor = new Text()
  replaceRoot ? elt.replaceWith(anchor) : elt.appendChild(anchor)
  // @ts-expect-error: (currentNodes, nextNodes) will be of type ChildNode[]
  createEffect((currentNodes) => {
    const nextNodes = createNodeArray([], resolve(childElement))
    reconcileNodes(anchor, currentNodes, nextNodes)
    return nextNodes
  }, [])
}

/**
 * @param {HTMLElement} elt
 * @param {string} prop
 * @param {*} data
 */
function renderAttr(elt, prop, data) {
  if (prop.startsWith(DIR_PREFIX)) {
    // @ts-expect-error: sliced prop will match DIR_KEY_RE
    const key = prop.slice(DIR_PREFIX_LENGTH).match(DIR_KEY_RE)[0]
    const directive = injectApp().directives[key]
    if (directive === undefined) {
      throw ERR_MISSING_DIRECTIVE
    }
    const binding = createBinding(prop, data)
    createEffect(() => directive(elt, binding))
  } else if (typeof data === "function") {
    createEffect((currentValue) => {
      const nextValue = data()
      if (nextValue !== currentValue) {
        setProperty(elt, prop, nextValue)
      }
      return nextValue
    })
  } else {
    setProperty(elt, prop, data)
  }
}

/**
 * @template Type
 * @param {string} prop
 * @param {Type} rawValue
 * @returns {Binding<Type>}
 */
function createBinding(prop, rawValue) {
  const arg = prop.match(BINDING_ARG_RE)?.[1] || null
  const modifiers = prop.match(BINDING_MOD_RE)?.reduce((modifiers, key) => {
    modifiers[key.slice(1)] = true
    return modifiers
  }, {}) || null
  return {
    get value() {
      return resolve(rawValue)
    },
    rawValue,
    arg,
    modifiers,
  }
}

/**
 * @param {Node[]} nodeArray
 * @param  {...SlotPrimitive} elements
 * @returns {Node[]}
 */
function createNodeArray(nodeArray, ...elements) {
  elements.length && elements.forEach((elt) => {
    if (elt == null || typeof elt === "boolean") {
      return
    }
    if (elt instanceof Node) {
      nodeArray.push(elt)
    } else if (typeof elt === "string" || typeof elt === "number") {
      nodeArray.push(new Text(elt + ""))
    } else if (typeof elt === "function") {
      createNodeArray(nodeArray, elt())
    } else if (Symbol.iterator in elt) {
      // @ts-expect-error: elt[Symbol.iterator] should be iterable by design
      createNodeArray(nodeArray, ...elt)
    }
  })
  return nodeArray
}

/**
 * @param {Node | ChildNode} anchor
 * @param {ChildNode[]} currentNodes
 * @param {(Node | ChildNode)[]} nextNodes
 */
function reconcileNodes(anchor, currentNodes, nextNodes) {
  nextNodes.length && nextNodes.forEach((nextNode, i) => {
    const child = currentNodes[i]
    currentNodes.length && currentNodes.some((currentNode, j) => {
      if (nextNode.nodeType === 3 && currentNode.nodeType === 3) {
        // @ts-expect-error: both nodes are of type Text
        currentNode.data = nextNode.data
      }
      if (nextNode.isEqualNode(currentNode)) {
        nextNodes[i] = currentNode
        currentNodes.splice(j, 1)
        return true
      }
    })
    if (nextNodes[i] !== child) {
      // @ts-expect-error: anchor should always have a parentNode
      anchor.parentNode.insertBefore(nextNodes[i], child?.nextSibling || anchor)
    }
  })
  currentNodes.length && currentNodes.forEach((node) => node.remove())
}

/**
 * @param {string} data
 * @returns {string}
 */
function toCamelCase(data) {
  return replace(data, KEBAB_RE, (match) => match.slice(1).toUpperCase())
}

/**
 * @param {string} data
 * @returns {string}
 */
function toKebabCase(data) {
  return replace(data, CAMEL_RE, "-$1").toLowerCase()
}

/**
 * @param {HTMLElement} elt
 * @param {string} prop
 * @param {*} value
 */
function setProperty(elt, prop, value) {
  if (prop in elt) {
    elt[prop] = value
    return
  }
  const name = toKebabCase(prop)
  if (value != null) {
    elt.setAttribute(name, value + "")
  } else {
    elt.removeAttribute(name)
  }
}

/**
 * @param {Event} event
 */
function delegatedEventListener(event) {
  const type = event.type
  /** @type {Node | ParentNode | null} */
  // @ts-expect-error: it is ok TS...everything will be fine
  let elt = event.target
  while (elt !== null) {
    elt?.[ON_DEL_DIR_SYM]?.[type]?.forEach?.((fn) => fn.call(elt, event))
    elt = elt.parentNode
  }
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<(elt: HTMLElement) => void>} binding
 */
function refDirective(elt, { rawValue }) {
  rawValue(elt)
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<string>} binding
 */
function styleDirective(elt, { arg, value }) {
  if (arg === null) {
    throw ERR_MISSING_BINDING_ARG
  }
  elt.style[arg] = value || null
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<*>} binding
 */
function bindDirective(elt, { arg, modifiers, value }) {
  if (arg === null) {
    throw ERR_MISSING_BINDING_ARG
  }
  if (modifiers?.camel) {
    arg = toCamelCase(arg)
  } else if (modifiers?.attr) {
    arg = toKebabCase(arg)
  }
  if (modifiers?.prop === true || arg in elt) {
    elt[arg] = value
  } else {
    elt.setAttribute(arg, value + "")
  }
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<string>} binding
 */
function htmlDirective(elt, { value }) {
  elt.innerHTML = value
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<string>} binding
 */
function textDirective(elt, { value }) {
  elt.textContent = value
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<boolean | "true" | "false">} binding
 */
function showDirective(elt, { value }) {
  elt.style.display = value === true || value === "true" ? "" : "none"
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<boolean | "true" | "false">} binding
 */
function ifDirective(elt, { value }) {
  elt[IF_DIR_SYM] = elt[IF_DIR_SYM] ?? new Text()
  const isTrue = value === true || value === "true",
    target = isTrue ? elt[IF_DIR_SYM] : elt
  target.replaceWith(isTrue ? elt : elt[IF_DIR_SYM])
}

/**
 * @param {HTMLElement} elt
 * @param {Binding<EventListener>} binding
 */
function onDirective(elt, { arg, modifiers, rawValue: listener }) {
  if (arg === null) {
    throw ERR_MISSING_BINDING_ARG
  }
  let id = arg, eventOptions
  if (modifiers) {
    const { once, capture, passive, prevent, stop, delegate } = modifiers
    eventOptions = { once, capture, passive }
    if (prevent) {
      id = id + "_prevent"
      const listenerCopy = listener
      listener = function (event) {
        event.preventDefault()
        listenerCopy.call(elt, event)
      }
    }
    if (stop) {
      id = id + "_stop"
      const listenerCopy = listener
      listener = function (event) {
        event.stopPropagation()
        listenerCopy.call(elt, event)
      }
    }
    if (once) {
      id = id + "_once"
    }
    if (capture) {
      id = id + "_capture"
    }
    if (passive) {
      id = id + "_passive"
    }
    if (delegate) {
      elt[ON_DEL_DIR_SYM] = elt[ON_DEL_DIR_SYM] || {}
      elt[ON_DEL_DIR_SYM][arg] = elt[ON_DEL_DIR_SYM][arg] || []
      elt[ON_DEL_DIR_SYM][arg].push(listener)
      if (DelegatedEvents[id] === undefined) {
        addEventListener(arg, delegatedEventListener, eventOptions)
        DelegatedEvents[id] = true
      }
      return
    }
  }
  elt.addEventListener(arg, listener, eventOptions)
}

/**
 * @overload
 * @param {string} data
 * @param {string | RegExp} match
 * @param {string} replacer
 * @returns {string}
 */
/**
 * @overload
 * @param {string} data
 * @param {string | RegExp} match
 * @param {(match: string, ...matches: string[]) => string} replacer
 * @returns {string}
 */
/**
 * @param {string} data
 * @param {string | RegExp} match
 * @param {*} replacer
 * @returns {string}
 */
function replace(data, match, replacer) {
  return data.replace(match, replacer)
}

/**
 * @template Type
 * @param {Type} data
 * @returns {Type extends (() => *) ? ReturnType<Type> : Type}
 */
function resolve(data) {
  return typeof data === "function" ? data() : data
}
