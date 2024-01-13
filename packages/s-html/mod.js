/**
 * @typedef {Element & { [key: string | symbol]: any }} DOMElement
 */
/**
 * @typedef {{
 *   readonly $parent: Context | undefined
 *   readonly $root: ParentNode
 *   readonly $directives: Directives
 *   readonly $components: Components
 *   readonly $refs: Record<string, Element>
 *   $event?: Event
 *   $elt?: DOMElement
 *   [key: string]: any
 * }} Context
 */
/**
 * @typedef {{
 *   readonly name: string
 *   readonly expression: string
 *   readonly arg: string | null
 *   readonly modifiers: Record<string, true | undefined> | null
 *   readonly context: Context
 *   evaluate(): any
 *   evaluate(expression: string): any
 * }} Binding
 */
/**
 * @typedef {(elt: DOMElement, binding: Binding) => void} Directive
 */
/**
 * @typedef {Record<string, Directive>} Directives
 */
/**
 * @typedef {{
 *   mount(parentNode: ParentNode): void | (() => void)
 * }} Application
 */
/**
 * @typedef {{
 *   [key: string]: any
 *   $directives?: Directives
 *   $components?: Components
 *   $template?: string
 *   $templateString?: string
 * }} ComponentResult
 */
/**
 * @typedef {(arg: any) => ComponentResult | void} Component
 */
/**
 * @typedef {Record<string, Component>} Components
 */
import { cleanup, effect, getNode, root } from "space/signal"

/**
 * @type {Context | null}
 */
let currentContext = null
const templateRE = /{{([^]+?)}}/g
const scopeRE = /^(?<n>[a-z][\w]+)\s*(?:\((?<e>[^]+)\))?$/i
const attrRE = /^(?<n>[a-z][\w-]+)(?::(?<a>[\w-]+))?(?:.(?<m>[.\w-]+))?/i
const forAliasRE = /^\s*(?<a>\S+)\s+(in|of)\s+(?<e>.+)/
const forAliasIndexRE = /^\s*\((?<a>\S+),\s*(?<i>\S+)\)\s+(in|of)\s+(?<e>.+)/
const scopeKey = "s-scope"
const shorthands = { ".": "bind", ":": "bind", "@": "on" }
/**
 * @type {Record<string, true | undefined>}
 */
const events = {}
/**
 * @type {Record<string, Function>}
 */
const evalCache = {}

/**
 * @type {Directives}
 */
const directives = {
  partial(elt, { expression, context }) {
    fetch(expression)
      .then((res) => res.text())
      .then((html) => {
        const template = document.createElement("template")
        template.innerHTML = html
        queryWalk(template.content, context)
        elt.replaceWith(template.content)
      })
  },
  bind(elt, { arg, modifiers, evaluate }) {
    let isProp = false
    if (arg === null) {
      return console.warn(`missing "arg"! s-bind:[id, ...]`)
    }
    if (modifiers?.camel) {
      arg = arg.replace(/-([a-z])/g, (_match, str) => str.toUpperCase())
    }
    if (modifiers?.prop) {
      isProp = true
    }
    const value = evaluate()
    if (isProp) {
      elt[arg] = value
    } else if (value != null) {
      elt.setAttribute(arg, value)
    } else {
      elt.removeAttribute(arg)
    }
  },
  effect(_elt, { evaluate }) {
    evaluate()
  },
  ref(elt, { expression, context }) {
    context.$refs[expression] = elt
  },
  html(elt, { evaluate }) {
    elt.innerHTML = evaluate()
  },
  text(elt, { evaluate }) {
    elt.textContent = evaluate()
  },
  modal(elt, { arg, evaluate }) {
    const key = arg ?? "value"
    elt.oninput = () => evaluate()[key] = elt.value
    effect(() => elt.value = evaluate()[key])
  },
  show(elt, { evaluate }) {
    const isTrue = evaluate() + "" === "true"
    elt.style.display = isTrue ? "" : "none"
  },
  for(elt, { expression, evaluate, context }) {
    const matches = (
      forAliasRE.exec(expression) ?? forAliasIndexRE.exec(expression)
    )?.groups
    if (matches === undefined) {
      throw new SyntaxError(
        `s-for: ${expression}!. alias in [expression] | (alias, index) in [expression]`,
      )
    }
    const before = new Text()
    elt.parentElement?.insertBefore(before, elt)
    let currentNodes
    cleanup(() => {
      before.remove()
      removeNodes(currentNodes)
    })
    effect(() => {
      let nextNodes
      Array.from(evaluate(matches.e)).forEach((item, index) => {
        root(() => {
          const forContext = createContext(
            elt.content.cloneNode(true),
            context,
          )
          forContext[matches.a] = item
          if (matches.i) {
            forContext[matches.i] = index
          }
          queryWalk(forContext.$root, forContext)
          if (nextNodes === undefined) {
            nextNodes = []
          }
          nextNodes.push(...Array.from(forContext.$root.childNodes))
        })
      })
      reconcile(elt.parentElement, before, currentNodes, nextNodes)
      currentNodes = nextNodes
    })
  },
  if(elt, { evaluate, context }) {
    const before = new Text()
    elt.parentElement?.insertBefore(before, elt)
    let currentNodes
    cleanup(() => {
      before.remove()
      removeNodes(currentNodes)
    })
    effect(() => {
      const isTrue = evaluate() + "" === "true"
      let nextNodes
      if (isTrue) {
        const ifContext = createContext(
          elt.content.cloneNode(true),
          context,
        )
        queryWalk(ifContext.$root, ifContext)
        nextNodes = Array.from(ifContext.$root.childNodes)
      }
      reconcile(elt.parentElement, before, currentNodes, nextNodes)
      currentNodes = nextNodes
    })
  },
  on(elt, { arg, context, evaluate, modifiers }) {
    if (arg === null) {
      return console.warn(`missing "arg"! s-on:[click, ...]`)
    }
    elt.__events = elt.__events ?? (elt.__events = {})
    elt.__events[arg] = (event) => {
      context.$event = event
      evaluate()
      delete context.$event
    }
    cleanup(() => delete elt.__events[arg])
    const eventOptions = {
        capture: modifiers?.capture,
        passive: modifiers?.passive,
      },
      bindOptions = {
        once: modifiers?.once,
        prevent: modifiers?.prevent,
        stop: modifiers?.stop,
      }
    const id = JSON.stringify({ arg, eventOptions })
    if (events[id] === undefined) {
      events[id] = true
      addEventListener(arg, eventListener.bind(bindOptions), eventOptions)
    }
  },
}

/**
 * @param {Components} components
 * @returns {Application}
 */
export function application(components) {
  return {
    mount(parentNode) {
      return root((cleanup) => {
        const context = createContext(parentNode)
        for (const name in components) {
          context.$components[name] = components[name]
        }
        parentNode
          .querySelectorAll(`[${scopeKey}]`)
          .forEach((elt) => scope(elt, context))
        return cleanup
      })
    },
  }
}

/**
 * @param {Element} elt
 * @param {Context} [parentContext]
 */
function scope(elt, parentContext) {
  root(() => {
    const key = elt.getAttribute(scopeKey)
    elt.removeAttribute(scopeKey)
    const context = createContext(elt, parentContext)
    if (key) {
      const componentTuple = getComponent(context, key)
      if (componentTuple === undefined) {
        throw new Error(`Unknown Component in s-scope="${key}"`)
      }
      const [component, props] = componentTuple
      const injections = component(props)
      if (injections) {
        Object.defineProperties(
          context,
          Object.getOwnPropertyDescriptors(injections),
        )
        if (injections.$template) {
          const template = document.querySelector(injections.$template)
          if (template === null) {
            throw new Error(`$template not found "${injections.$template}"`)
          }
          if (!(template instanceof HTMLTemplateElement)) {
            throw new Error(
              `$template is not referring to HTMLTemplateElement "${injections.$template}"`,
            )
          }
          const fragment = template.content.cloneNode(true)
          queryWalk(fragment, context)
          return elt.replaceWith(fragment)
        } else if (injections.$templateString) {
          const template = document.createElement("template")
          template.innerHTML = injections.$templateString
          queryWalk(template.content, context)
          return elt.replaceWith(template.content)
        }
      }
    }
    queryWalk(elt, context)
  })
}

/**
 * @param {CharacterData} node
 * @param {Context} context
 */
function text(node, context) {
  const original = node.data
  effect(() => {
    node.data = original.replace(templateRE, (_match, expression) => {
      return evaluate(context, null, expression) + ""
    })
  })
}

/**
 * @param {Element} elt
 * @param {Context} context
 */
function attributes(elt, context) {
  if (elt.getAttribute(scopeKey)) {
    scope(elt, context)
  }
  for (const attr of Array.from(elt.attributes)) {
    const longhand = shorthands[attr.name[0]]
    if (longhand || attr.name.startsWith("s-")) {
      const binding = createBinding(
        elt,
        longhand ? longhand + ":" + attr.name.slice(1) : attr.name.slice(2),
        attr.value,
        context,
      )
      elt.removeAttributeNode(attr)
      const directiveName = longhand ?? binding.name,
        directive = getDirective(context, directiveName)
      if (directive === undefined) {
        throw new Error(`Unknown directive s-${directiveName}`)
      }
      effect(() => directive(elt, binding))
    }
  }
}

/**
 * @param {Context} context
 * @param {string} name
 * @returns {Directive | undefined}
 */
function getDirective(context, name) {
  let directive = context.$directives[name]
  if (directive !== undefined) {
    return directive
  }
  let parentContext = context.$parent
  while (parentContext) {
    directive = parentContext.$directives[name]
    if (directive !== undefined) {
      return directive
    }
    parentContext = parentContext.$parent
  }
  return directives[name]
}

/**
 * @param {Context} context
 * @param {string} key
 * @returns {[Component, Record<string, any> | undefined] | undefined}
 */
function getComponent(context, key) {
  const matches = scopeRE.exec(key)?.groups
  if (matches === undefined) {
    throw new SyntaxError(`s-scope="${key}" doesn't match ${scopeRE}.`)
  }
  const name = matches.n,
    props = matches.e ? evaluate(context, null, matches.e) : undefined
  let component = context.$components[name]
  if (component !== undefined) {
    return [component, props]
  }
  let parentContext = context.$parent
  while (parentContext) {
    component = parentContext.$components[name]
    if (component !== undefined) {
      return [component, props]
    }
    parentContext = parentContext.$parent
  }
  if (globalThis[name]) {
    return [globalThis[name], props]
  }
}

/**
 * @param {Node} node
 * @param {Context} context
 */
function queryWalk(node, context) {
  walkNode(node, (node) => {
    if (node.__touched) {
      return
    }
    switch (node.nodeType) {
      case 1: {
        // @ts-ignore: now you are an element, lol
        attributes(node, context)
        break
      }
      case 3: {
        if (templateRE.test(node.data)) {
          // @ts-ignore: now you are a text or comment, lol
          text(node, context)
        }
      }
    }
    node.__touched = true
  })
}

/**
 * @param {Element} elt
 * @param {string} name
 * @param {string} value
 * @param {Context} context
 * @returns {Binding}
 */
function createBinding(elt, name, value, context) {
  const groups = attrRE.exec(name)?.groups
  if (groups === undefined) {
    throw new SyntaxError(`${name}="${value}" doesn't match ${attrRE}`)
  }
  return {
    name: groups.n,
    expression: value,
    arg: groups.a ?? null,
    modifiers: groups.m?.split(".").reduce((mods, key) => {
      mods[key] = true
      return mods
    }, {}) ?? null,
    context,
    evaluate(expression) {
      return evaluate(context, elt, expression ?? value)
    },
  }
}

/**
 * @param {Context} context
 * @param {Element | null} elt
 * @param {string} expression
 */
function evaluate(context, elt, expression) {
  const fn = evalCache[expression] ||
    (evalCache[expression] = Function(
      "$context",
      "$elt",
      `with($context) return(${expression})`,
    ))
  try {
    currentContext = context
    return fn(contextProxy, elt)
  } catch (error) {
    console.warn(`Error at evaluating expression "${expression}":`)
    console.error(error)
  } finally {
    currentContext = null
  }
}

/**
 * @param {Node} node
 * @param {(node: Node & Record<string | symbol, any>, callback: () => any) => void} callback
 */
function walkNode(node, callback) {
  callback(node, () => {})
  let childNode = node.firstChild
  while (childNode) {
    walkNode(childNode, callback)
    childNode = childNode.nextSibling
  }
}

/**
 * @this {{
 *   stop: boolean | undefined
 *   prevent: boolean | undefined
 *   once: boolean | undefined
 * }}
 * @param {Event | Record<string, any>} event
 */
function eventListener(event) {
  let elt = event.target
  const type = event.type
  if (this.stop) {
    event.stopPropagation()
  }
  if (this.prevent) {
    event.preventDefault()
  }
  while (elt) {
    if (elt?.__events?.[type]) {
      elt.__events[type].call(elt, event)
      if (this.once) {
        elt.__events[type] = undefined
      }
    }
    elt = elt.parentNode
  }
}

/**
 * @param {ParentNode} $root
 * @param {Context} [$parent]
 * @returns {Context}
 */
function createContext($root, $parent) {
  return getNode().context = {
    $parent,
    $root,
    $directives: {},
    $components: {},
    $refs: {},
  }
}

/**
 * @param {Context | null} context
 * @param {string | symbol} key
 * @param {(context: Context) => any} callback
 */
function walkContext(context, key, callback) {
  if (context === null) {
    return
  }
  if (Reflect.has(context, key)) {
    return callback(context)
  }
  let parentContext = context.$parent
  while (parentContext) {
    if (Reflect.has(parentContext, key)) {
      return callback(parentContext)
    }
    parentContext = parentContext.$parent
  }
}

/**
 * @type {Context}
 */
const contextProxy = new Proxy(Object.create(null), {
  getOwnPropertyDescriptor(_target, key) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.getOwnPropertyDescriptor(context, key)
    })
  },
  defineProperty(_target, key, attributes) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.defineProperty(context, key, attributes)
    }) ?? false
  },
  deleteProperty(_target, key) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.deleteProperty(context, key)
    }) ?? false
  },
  has(_target, key) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.has(context, key)
    }) ?? false
  },
  get(_target, key) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.get(context, key)
    })
  },
  set(_target, key, value) {
    return walkContext(currentContext, key, (context) => {
      return Reflect.set(context, key, value)
    }) ?? false
  },
})

/**
 * @param {ParentNode | null} rootElement
 * @param {ChildNode | null} anchor
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
  removeNodes(currentNodes)
}

/**
 * @param {ChildNode[] | undefined} currentNodes
 */
function removeNodes(currentNodes) {
  while (currentNodes?.length) {
    currentNodes.pop()?.remove()
  }
}
