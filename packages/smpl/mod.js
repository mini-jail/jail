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
 * @typedef {{ [name: string | number | symbol]: unknown }} Injections
 */
/**
 * @typedef {($data: Data, $injections?: Injections) => void} Handler
 */
/**
 * @type {{ [fnBody: string]: Handler }}
 */
const fnCache = {}
const attrRegExp = /[.:@$](?<name>[^.:]+)(?::(?<arg>[^.:]+))?(?:.(?<mod>\S+)*)?/
const placeholderRegExp = /{{\s*([^]+?)\s*}}/g
const forRegExp = /\(\s*(?<var>[^]+?)\s*\) of (?<exp>[^]+)/
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
    const groups = forRegExp.exec(binding.exp)?.groups
    if (groups === undefined) {
      throw SyntaxError(binding.exp)
    }
    const getter = () => {
      try {
        return Array.from(evaluate(binding.data, groups.exp))
      } catch (error) {
        console.error(error)
        return []
      }
    }
    const children = computed((children) => {
      const nextChildren = getter().map((item, index) => {
        const copy = /** @type {DocumentFragment} */ (fragment.cloneNode(true))
        walk(copy, binding.data, { item, index })
        return Array.from(copy.childNodes)
      }).flat(1)
      reconcile(parent, template, children, nextChildren)
      return nextChildren
    })
    onCleanup(() => {
      children.value?.forEach((child) => child.remove())
    })
  },
  if(elt, binding) {
    const template = /** @type {HTMLTemplateElement} */ (elt)
    const fragment = template.content.cloneNode(true)
    const parent = template.parentElement
    const children = computed((children) => {
      let nextChildren
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
 * @param {Data} data
 * @param {string} exp
 * @param {Injections} [injections]
 */
export function evaluate(data, exp, injections) {
  return execute(data, `return(${exp})`, injections)
}

/**
 * @param {Data} data
 * @param {string} exp
 * @param {Injections} [injections]
 * @returns {any}
 */
export function execute(data, exp, injections) {
  const fn = fnCache[exp] ?? (fnCache[exp] = toFunction(exp))
  try {
    return fn(data, injections)
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
      "__data__",
      "__injections__",
      `with(Object.assign({}, __data__, __injections__)){${exp}}`,
    ))
  } catch (error) {
    console.error(error, exp)
    return () => {}
  }
}

/**
 * @param {Element} elt
 * @param {Data} data
 * @returns {Binding[]}
 */
function getBindings(elt, data) {
  return Array.from(elt.attributes).reduce((attrs, { name, value }) => {
    if (/^[$@.:]/.test(name)) {
      elt.removeAttribute(name)
      const options = attrRegExp.exec(name)?.groups
      attrs.push({
        type: attrTypes[name[0]],
        name: /** @type {string} */ (options?.name),
        data,
        exp: value,
        arg: options?.arg ?? null,
        modifiers: options?.mod?.split(".").reduce((mods, key) => {
          mods[key] = true
          return mods
        }, {}) ?? null,
        get value() {
          return evaluate(this.data, this.exp, { $el: elt })
        },
      })
    }
    return attrs
  }, /** @type {Binding[]} */ ([]))
}

/**
 * @param {Node} node
 * @param {Data} data
 * @param {Injections} [injections]
 */
function walk(node, data, injections) {
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
          return String(evaluate(data, exp, injections))
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
    for (const binding of getBindings(elt, data)) {
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
            evaluate(binding.data, binding.exp, { $el: elt, $ev: event })
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
    walk(child, data, injections)
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
