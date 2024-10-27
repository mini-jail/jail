/**
 * @template Type
 * @typedef {{
 *   (): Type
 *   (value: Type): void
 *   (fn: (value: Type) => Type): void
 * }} Signal
 */
/**
 * @type {WeakMap<object, SignalNode[]>}
 */
const sourceMap = new WeakMap()
/**
 * @type {Set<SignalNode>}
 */
const nodeQueue = new Set()
const errorKey = Symbol("Error")
let isRunning = false
/**
 * @type {SignalNode?}
 */
let activeNode = null
function SignalNode() {
  this.value = undefined
  this.parentNode = activeNode
  /**
   * @type {SignalNode[]?}
   */
  this.childNodes = null
  /**
   * @type {object[]?}
   */
  this.sources = null
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
 * @param {SignalNode | null} node
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
 * @param {SignalNode} node
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
 * @param {SignalNode} node
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
 * @param {SignalNode} node
 * @param {boolean} [dispose]
 */
function cleanNode(node, dispose) {
  if (node.sources?.length) {
    let source = node.sources.pop(), sourceNodes
    while (source) {
      sourceNodes = sourceMap.get(source)
      if (sourceNodes) {
        let nodeIndex = sourceNodes.indexOf(node)
        while (nodeIndex !== -1) {
          sourceNodes.splice(nodeIndex, 1)
          nodeIndex = sourceNodes.indexOf(node)
        }
      }
      source = node.sources.pop()
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
    node.sources = null
    node.cleanups = null
    node.onupdate = null
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
  const node = new SignalNode()
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
    const node = new SignalNode()
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
 * @param {object} source
 */
export function pull(source) {
  if (activeNode?.onupdate) {
    const nodeSet = sourceMap.get(source)
    if (nodeSet === undefined) {
      sourceMap.set(source, [activeNode])
    } else {
      nodeSet.push(activeNode)
    }
    if (activeNode.sources === null) {
      activeNode.sources = [source]
    } else {
      activeNode.sources.push(source)
    }
  }
}
/**
 * @param {object} source
 */
export function push(source) {
  sourceMap.get(source)?.forEach(addNodeToQueue)
}
