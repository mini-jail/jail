import { computed, createRoot, effect, onCleanup } from "space/signal"

/**
 * @typedef {{
 *   mount(rootElement?: Element): void
 * }} App
 */
/**
 * @typedef {{
 *   readonly type: "property" | "attribute" | "event" | "directive"
 *   readonly name: string
 *   readonly data: Data
 *   readonly value: any
 *   readonly exp: string
 *   readonly arg: string | null
 *   readonly modifiers: { readonly [name: string]: true | undefined } | null
 * }} Binding
 */
/**
 * @typedef {(elt: HTMLElement, binding: Binding) => void} Directive
 */
/**
 * @typedef {{
 *   [name: string | number | symbol]: unknown
 *   [directive: `$${string}`]: Directive
 * }} Data
 */
/**
 * @typedef {(...args: object[]) => void} Handler
 */
/**
 * @type {{ [fnBody: string]: Handler }}
 */
const fnCache = {}
const attrRegExp = /[.:@$](?<name>[^.:]+)(?::(?<arg>[^.:]+))?(?:.(?<mod>\S+)*)?/
const placeholderRegExp = /{{\s*([^]+?)\s*}}/g
const attrTypes = {
  ".": "property",
  ":": "attribute",
  "@": "event",
  "$": "directive",
}
/**
 * @type {{ [name: string]: Directive }}
 */
const directives = {
  show(elt, binding) {
    elt.style.display = String(!!binding.value) === "true" ? "" : "none"
  },
  text(elt, binding) {
    elt.textContent = String(binding.value)
  },
  html(elt, binding) {
    elt.innerHTML = String(binding.value)
  },
  effect(_elt, { value: _value }) {},
  template(elt, binding) {
    const template = /** @type {HTMLTemplateElement} */ (elt)
    template.innerHTML = binding.value
    const fragment = template.content.cloneNode(true)
    walk(fragment, binding.data)
    elt.parentNode?.insertBefore(fragment, elt)
  },
  for(elt, binding) {
    const template = /** @type {HTMLTemplateElement} */ (elt)
    const fragment = template.content.cloneNode(true)
    const parent = template.parentElement
    let data
    const getter = () => {
      try {
        data = binding.data
        return Array.from(evaluate(binding.exp, data))
      } catch (error) {
        console.error(error)
        return []
      }
    }
    const children = computed((children) => {
      const nextChildren = getter().map((value, index, array) => {
        const copy = /** @type {DocumentFragment} */ (fragment.cloneNode(true))
        walk(copy, data, { value, index, array })
        return Array.from(copy.childNodes)
      }).flat(1)
      reconcile(parent, template, children, nextChildren)
      return nextChildren
    })
    onCleanup(() => {
      data = undefined
      children.value?.forEach((child) => child.remove())
    })
  },
  if(elt, binding) {
    const template = /** @type {HTMLTemplateElement} */ (elt)
    const fragment = template.content.cloneNode(true)
    const parent = template.parentElement
    const children = computed((children) => {
      let nextChildren = null
      if (binding.value) {
        const copy = /** @type {DocumentFragment} */ (fragment.cloneNode(true))
        walk(copy, binding.data)
        nextChildren = Array.from(copy.childNodes)
      }
      reconcile(parent, template, children, nextChildren)
      return nextChildren
    })
    onCleanup(() => {
      children.value?.forEach((child) => child.remove())
    })
  },
}

/**
 * @param {string} exp
 * @param {...object} args
 */
function evaluate(exp, ...args) {
  return execute(`return(${exp})`, ...args)
}

/**
 * @param {string} exp
 * @param {...object} args
 * @returns {any}
 */
function execute(exp, ...args) {
  const fn = fnCache[exp] ?? (fnCache[exp] = toFunction(exp))
  try {
    return fn(...args)
  } catch (error) {
    console.error(error, exp)
  }
}

/**
 * @param {string} exp
 * @returns {Handler}
 */
function toFunction(exp) {
  try {
    return /** @type {Handler} */ (new Function(
      "...args",
      `with(Object.assign({}, ...args)){${exp}}`,
    ))
  } catch (error) {
    console.error(error, exp)
    return () => {}
  }
}

/**
 * @param {Element} elt
 * @param {...object} data
 * @returns {Binding[]}
 */
function getBindings(elt, ...data) {
  return Array.from(elt.attributes).reduce((attrs, { name, value }) => {
    if (/^[$@.:]/.test(name)) {
      elt.removeAttribute(name)
      const options = attrRegExp.exec(name)?.groups
      attrs.push({
        type: attrTypes[name[0]],
        name: /** @type {string} */ (options?.name),
        get data() {
          return Object.assign({}, ...data)
        },
        exp: value,
        arg: options?.arg ?? null,
        modifiers: options?.mod?.split(".").reduce((mods, key) => {
          mods[key] = true
          return mods
        }, {}) ?? null,
        get value() {
          return evaluate(this.exp, this.data, { $el: elt })
        },
      })
    }
    return attrs
  }, /** @type {Binding[]} */ ([]))
}

/**
 * @param {Node} node
 * @param {...object} data
 */
function walk(node, ...data) {
  const type = node.nodeType
  if (type === 8) {
    return
  }
  if (type === 3) {
    const text = /** @type {Text} */ (node)
    const dataCopy = text.data
    if (placeholderRegExp.test(dataCopy)) {
      effect(() => {
        text.data = dataCopy.replace(placeholderRegExp, (_match, exp) => {
          return String(evaluate(exp, ...data))
        })
      })
    }
    return
  }
  if (type === 1) {
    const elt = /** @type {HTMLElement} */ (node)
    if (elt.hasAttribute("$ignore")) {
      return
    }
    for (const binding of getBindings(elt, ...data)) {
      if (binding.type === "attribute") {
        effect(() => {
          const value = binding.value
          if (value != null) {
            elt.setAttribute(binding.name, value)
          } else {
            elt.removeAttribute(binding.name)
          }
        })
      } else if (binding.type === "property") {
        effect(() => {
          elt[binding.name] = binding.value
        })
      } else if (binding.type === "event") {
        elt.addEventListener(
          binding.name,
          (event) => {
            if (binding.modifiers?.prevent) {
              event.preventDefault()
            }
            if (binding.modifiers?.stop) {
              event.stopPropagation()
            }
            evaluate(binding.exp, binding.data, { $el: elt, $ev: event })
          },
          {
            capture: binding.modifiers?.capture,
            once: binding.modifiers?.once,
            passive: binding.modifiers?.passive,
          },
        )
      } else if (binding.type === "directive") {
        const directive = directives[binding.name] ?? data["$" + binding.name]
        effect(() => directive(elt, binding))
      }
    }
  }
  let child = node.firstChild
  while (child) {
    walk(child, ...data)
    child = child.nextSibling
  }
}

/**
 * @param {Node | undefined | null} parentNode
 * @param {Node | undefined | null} before
 * @param {ChildNode[] | undefined | null} currentNodes
 * @param {ChildNode[] | undefined | null} nextNodes
 */
function reconcile(parentNode, before, currentNodes, nextNodes) {
  nextNodes?.forEach((nextNode, i) => {
    const child = currentNodes?.[i]
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
    if (child !== nextNodes[i]) {
      parentNode?.insertBefore(
        nextNodes[i],
        child?.nextSibling ?? before ?? null,
      )
    }
  })
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}

/**
 * @param {Data} data
 * @returns {App}
 */
export function createApp(data) {
  return {
    mount(rootElement) {
      if (rootElement == null) {
        rootElement = document.documentElement
      }
      createRoot(() => {
        walk(rootElement, data)
      })
    },
  }
}
