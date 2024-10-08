/**
 * @typedef {() => void} Cleanup
 */
/**
 * @template Type
 * @typedef {Type extends Resolvable ? Type["value"] : Type} Resolved
 */
/**
 * @typedef {{ value: any }} Resolvable
 */
/**
 * @type {WeakMap<State, Set<Node>>}
 */
const effectMap = new WeakMap()
/**
 * @type {Set<Node>}
 */
const effectQueue = new Set()
const errorKey = Symbol("Error")
let isRunning = false
/**
 * @type {Node | null}
 */
let activeNode = null

/**
 * @returns {Node}
 */
export function getNode() {
  if (activeNode === null) {
    throw new Error("getNode(): activeNode is null!")
  }
  return activeNode
}

/**
 * @template Type
 * @param {(cleanup: Cleanup) => Type} fn
 * @returns {Type | undefined}
 */
export function createRoot(fn) {
  const node = new Node()
  try {
    activeNode = node
    return fn(() => cleanNode(node, true))
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = node.parentNode
  }
}

/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} value
 * @returns {void}
 */
export function provide(key, value) {
  if (activeNode === null) {
    throw new Error("provide(key, value): activeNode is null!")
  }
  if (activeNode.context === null) {
    activeNode.context = {}
  }
  activeNode.context[key] = value
}

/**
 * @template Type
 * @overload
 * @param {string | symbol} key
 * @returns {Type | undefined}
 */
/**
 * @template Type
 * @overload
 * @param {string | symbol} key
 * @param {Type} value
 * @returns {Type}
 */
/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} [value]
 * @returns {Type | undefined}
 */
export function inject(key, value) {
  return lookup(activeNode, key) ?? value
}

/**
 * @param {Node | null} node
 * @param {string | symbol} key
 * @returns {any}
 */
function lookup(node, key) {
  return node === null
    ? undefined
    : node.context !== null && key in node.context
    ? node.context[key]
    : lookup(node.parentNode, key)
}

/**
 * @template Type
 * @param {() => Type} fn
 * @returns {Type}
 */
export function untrack(fn) {
  const node = activeNode
  activeNode = null
  try {
    return fn()
  } finally {
    activeNode = node
  }
}

/**
 * @overload
 * @param {() => void} update
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {(value: Type | undefined) => Type} update
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {(value: Type) => Type} update
 * @param {Type} value
 * @returns {void}
 */
/**
 * @param {(value: any) => any} update
 * @param {any} [value]
 * @returns {void}
 */
export function effect(update, value) {
  const node = new Node()
  node.value = value
  node.onupdate = update
  if (isRunning) {
    effectQueue.add(node)
  } else {
    queueMicrotask(() => updateNode(node))
  }
}

/**
 * @param {Node} node
 * @param {boolean} dispose
 */
function cleanNode(node, dispose) {
  if (node.states?.length) {
    let state = node.states.pop()
    while (state) {
      effectMap.get(state)?.delete(node)
      state = node.states.pop()
    }
  }
  if (node.childNodes?.length) {
    let childNode = node.childNodes.pop()
    while (childNode) {
      cleanNode(childNode, childNode.onupdate ? true : dispose)
      childNode = node.childNodes.pop()
    }
  }
  if (node.cleanups?.length) {
    let cleanup = node.cleanups.pop()
    while (cleanup) {
      cleanup()
      cleanup = node.cleanups.pop()
    }
  }
  node.context = null
  if (dispose) {
    node.value = undefined
    node.parentNode = null
    node.childNodes = null
    node.states = null
    node.cleanups = null
    node.onupdate = null
  }
}

/**
 * @param {Node} node
 */
function updateNode(node) {
  cleanNode(node, false)
  if (node.onupdate === null) {
    return
  }
  const prevNode = activeNode
  try {
    activeNode = node
    node.value = node.onupdate(node.value)
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = prevNode
  }
}

/**
 * @param {Cleanup} cleanup
 */
export function onCleanup(cleanup) {
  if (activeNode === null) {
    throw new Error("onCleanup(cleanup): activeNode is null!")
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanup]
  } else {
    activeNode.cleanups.push(cleanup)
  }
}

/**
 * @param {(error: any) => void} fn
 */
export function catchError(fn) {
  if (activeNode === null) {
    throw new Error(`catchError(fn): activeNode is null!`)
  }
  if (activeNode.context === null) {
    activeNode.context = {}
  }
  if (activeNode.context[errorKey]) {
    activeNode.context[errorKey].push(fn)
  } else {
    activeNode.context[errorKey] = [fn]
  }
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorFns = lookup(activeNode, errorKey)
  if (!errorFns) {
    return reportError(error)
  }
  for (const errorFn of errorFns) {
    errorFn(error)
  }
}

/**
 * @param {Node} node
 */
function queueNode(node) {
  effectQueue.add(node)
  if (isRunning === false) {
    isRunning = true
    queueMicrotask(() => {
      for (const effect of effectQueue) {
        updateNode(effect)
      }
      effectQueue.clear()
      isRunning = false
    })
  }
}

/**
 * @param {any} data
 * @returns {data is Resolvable}
 */
export function isResolvable(data) {
  return data && typeof data === "object" && Reflect.has(data, "value")
}

/**
 * @template Type
 * @param {Type} data
 * @returns {Resolved<Type>}
 */
export function resolve(data) {
  return isResolvable(data) ? data.value : data
}

/**
 * @template Type
 */
class Node {
  /** @type {Type | undefined} */
  value
  /** @type {Node | null} */
  parentNode = null
  /** @type {Node[] | null} */
  childNodes = null
  /** @type {State[] | null} */
  states = null
  /** @type {{ [key: string |  symbol]: any } | null} */
  context = null
  /** @type {Cleanup[] | null} */
  cleanups = null
  /** @type {((value: Type) =>  Type)  | null} */
  onupdate = null
  constructor() {
    if (activeNode) {
      this.parentNode = activeNode
      if (activeNode.childNodes === null) {
        activeNode.childNodes = [this]
      } else {
        activeNode.childNodes.push(this)
      }
    }
  }
}

/**
 * @template Type
 */
export class State {
  /** @type {Type} */
  #value
  /** @type {(currentValue: Type | undefined, nextValue: Type | undefined) => boolean} */
  equals = (currentValue, nextValue) => currentValue === nextValue
  /**
   * @param {Type} [value]
   */
  constructor(value) {
    this.#value = /** @type {Type} */ (value)
  }
  get value() {
    if (activeNode?.onupdate) {
      let effects = effectMap.get(this)
      if (effects === undefined) {
        effectMap.set(this, effects = new Set())
      }
      effects.add(activeNode)
      if (activeNode.states === null) {
        activeNode.states = [this]
      } else if (!activeNode.states.includes(this)) {
        activeNode.states.push(this)
      }
    }
    return this.#value
  }
  set value(value) {
    if (this.equals(this.#value, value) === false) {
      this.#value = value
      effectMap.get(this)?.forEach(queueNode)
    }
  }
  get() {
    return this.value
  }
  /**
   * @param {Type} value
   */
  set(value) {
    this.value = value
  }
  peek() {
    return this.#value
  }
  [Symbol.toPrimitive]() {
    return this.value
  }
  [Symbol.toStringTag]() {
    return String(this.value)
  }
}

/**
 * @template Type
 */
export class Computed {
  /** @type {State<Type>} */
  #state = new State()
  /**
   * @param {(value: Type | undefined) => Type} fn
   */
  constructor(fn) {
    effect(() => {
      this.#state.value = fn(this.#state.peek())
    })
  }
  get value() {
    return this.#state.value
  }
  peek() {
    return this.#state.peek()
  }
  [Symbol.toPrimitive]() {
    return this.value
  }
  [Symbol.toStringTag]() {
    return String(this.value)
  }
}

/**
 * @template Type
 * @param {Type} [value]
 */
export function state(value) {
  return new State(value)
}

/**
 * @template Type
 * @param {(value: Type | undefined) => Type} fn
 */
export function computed(fn) {
  return new Computed(fn)
}
