/**
 * @template Type
 * @typedef {{
 *   (): Type
 *   (value: Type): void
 *   (fn: (value: Type) => Type): void
 * }} Signal
 */
/**
 * @type {WeakMap<object, Set<Node>>}
 */
const targetMap = new WeakMap()
/**
 * @type {WeakMap<Node, object[]>}
 */
const nodeMap = new WeakMap()
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
function Node() {
  this.value = undefined
  this.parentNode = activeNode
  /**
   * @type {Node[]?}
   */
  this.childNodes = null
  /**
   * @type {{ [key: string |  symbol]: any }?}
   */
  this.context = null
  /**
   * @type {(() => void)[]?}
   */
  this.cleanups = null
  /**
   * @type {((value: unknown) => unknown)?}
   */
  this.onupdate = null
  if (activeNode) {
    if (activeNode.childNodes === null) {
      activeNode.childNodes = [this]
    } else {
      activeNode.childNodes.push(this)
    }
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
  errorFns.forEach((fn) => fn(error))
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
  const targets = nodeMap.get(node)
  if (targets?.length) {
    let target = targets.pop()
    while (target) {
      targetMap.get(target)?.delete(node)
      target = targets.pop()
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
    nodeMap.delete(node)
  }
}
/**
 * @template Type
 * @overload
 * @returns {Signal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {Type} value
 * @returns {Signal<Type>}
 */
export function signal(value) {
  return function Signal() {
    if (arguments.length) {
      value = typeof arguments[0] === "function"
        ? arguments[0](value)
        : arguments[0]
      return push(Signal)
    }
    pull(Signal)
    return value
  }
}
/**
 * @template Type
 * @param {() => Type} fn
 * @returns {() => Type}
 */
export function computed(fn) {
  const computed = signal()
  effect(() => computed(fn()))
  return () => computed()
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
  const prevNode = activeNode
  try {
    const node = new Node()
    activeNode = node
    return fn(() => cleanNode(node, true))
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = prevNode
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
 * @param {object} target
 */
export function pull(target) {
  if (activeNode?.onupdate) {
    let nodes = targetMap.get(target)
    let targets = nodeMap.get(activeNode)
    if (nodes === undefined) {
      targetMap.set(target, nodes = new Set())
    }
    if (targets === undefined) {
      nodeMap.set(activeNode, targets = [])
    }
    nodes.add(activeNode)
    targets.push(target)
  }
}
/**
 * @param {object} target
 */
export function push(target) {
  targetMap.get(target)?.forEach(addNodeToQueue)
}
