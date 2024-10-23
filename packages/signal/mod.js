/**
 * @type {WeakMap<State, Set<Node>>}
 */
const effectMap = new WeakMap()
/**
 * @type {Set<Node>}
 */
const nodeQueue = new Set()
const errorKey = Symbol("Error")
let isRunning = false
/**
 * @type {Node?}
 */
let activeNode = null
/**
 * @template [Type = any]
 */
export class Node {
  /**
   * @type {Type | undefined}
   */
  value
  /**
   * @type {Node?}
   */
  parentNode = activeNode
  /**
   * @type {Node[]?}
   */
  childNodes = null
  /**
   * @type {State[]?}
   */
  states = null
  /**
   * @type {{ [key: string |  symbol]: any }?}
   */
  context = null
  /**
   * @type {(() => void)[]?}
   */
  cleanups = null
  /**
   * @type {((value: Type | undefined) => Type)?}
   */
  onupdate = null
  constructor() {
    if (activeNode) {
      if (activeNode.childNodes === null) {
        activeNode.childNodes = [this]
      } else {
        activeNode.childNodes.push(this)
      }
    }
  }
}
/**
 * @template [Type = any]
 */
export class State {
  /**
   * @protected
   * @type {Type}
   */
  internalValue
  /**
   * @param {Type} [value]
   */
  constructor(value) {
    this.internalValue = /** @type {Type} */ (value)
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
    return this.internalValue
  }
  set value(value) {
    this.internalValue = value
    effectMap.get(this)?.forEach(addNodeToQueue)
  }
}
/**
 * @template [Type = any]
 * @extends {State<Type>}
 */
class Computed extends State {
  /**
   * @param {() => Type} fn
   */
  constructor(fn) {
    super()
    effect(() => {
      super.value = fn()
    })
  }
  /**
   * @override
   */
  get value() {
    return super.value
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
 * @param {() => Type} fn
 */
export function computed(fn) {
  return new Computed(fn)
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
 * @param {(value: any) => any} update
 * @returns {void}
 */
export function effect(update) {
  const node = new Node()
  node.onupdate = update
  if (isRunning) {
    nodeQueue.add(node)
  } else {
    queueMicrotask(() => updateNode(node))
  }
}
/**
 * @template Type
 * @param {(cleanup: () => void) => Type} fn
 * @returns {Type | undefined}
 */
export function root(fn) {
  const node = new Node()
  try {
    activeNode = node
    return fn(() => cleanNode(node))
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
 * @param {() => void} cleanup
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
 * @param {Node} node
 */
function addNodeToQueue(node) {
  nodeQueue.add(node)
  if (isRunning === false) {
    isRunning = true
    queueMicrotask(() => {
      nodeQueue.forEach(updateNode)
      nodeQueue.clear()
      isRunning = false
    })
  }
}
/**
 * @param {Node} node
 * @param {boolean} [dispose]
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
    node.cleanups = null
    node.onupdate = null
    node.states = null
  }
}
