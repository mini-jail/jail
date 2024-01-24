import { getNode } from "space/signal"

/**
 * @type {import("./mod.js").Context | null}
 */
let currentContext = null
/**
 * @type {Record<string, Function>}
 */
const fnCache = {}

/**
 * @param {import("./mod.js").Context | null} context
 * @param {string | symbol} key
 * @param {(context: import("./mod.js").Context) => any} callback
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
 * @param {Node} root
 * @param {import("./mod.js").Context} [parent]
 * @returns {import("./mod.js").Context}
 */
export function createContext(root, parent) {
  return getNode().context = {
    $parent: parent ?? null,
    $root: root,
    $directives: {},
    $refs: {},
  }
}
/**
 * @type {import("./mod.js").Context}
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
 * @param {import("./mod.js").Context} context
 * @param {Element | null} elt
 * @param {string} expression
 */
export function evaluate(context, elt, expression) {
  const fn = fnCache[expression] ||
    (fnCache[expression] = Function(
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
