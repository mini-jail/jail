/// <reference types="./mod.d.ts" />

export const ERROR_INJECTION_KEY = Symbol()
/**
 * @type {Set<import("jail/signal").Node>}
 */
const NodeQueue = new Set()
let isRunning = false
/**
 * @type {import("jail/signal").Node | null}
 */
let activeNode = null

/**
 * @param {(cleanup: import("jail/signal").Cleanup) => any} callback
 * @returns {any | undefined}
 */
export function createRoot(callback) {
  const previousNode = activeNode, localNode = createNode()
  try {
    activeNode = localNode
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : () => cleanNode(localNode, true),
      )
    )
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

/**
 * @returns {import("jail/signal").Node | null}
 */
export function nodeRef() {
  return activeNode
}

/**
 * @param {import("jail/signal").Node} node
 * @param {import("jail/signal").Getter} getter
 * @returns {any | undefined}
 */
export function withNode(node, getter) {
  const localNode = activeNode
  activeNode = node
  let result
  try {
    result = getter()
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = localNode
  }
  return result
}

/**
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Node}
 */
function createNode(initialValue) {
  const localNode = {
    value: initialValue,
    parentNode: activeNode,
    childNodes: null,
    injections: null,
    cleanups: null,
    onupdate: null,
    sources: null,
    sourceSlots: null,
  }
  if (activeNode !== null) {
    if (activeNode.childNodes === null) {
      activeNode.childNodes = [localNode]
    } else {
      activeNode.childNodes.push(localNode)
    }
  }
  return localNode
}

/**
 * @param {() => void} callback
 */
export function onMount(callback) {
  createEffect(() => untrack(callback))
}

/**
 * @param {import("jail/signal").Cleanup} cleanup
 */
export function onUnmount(cleanup) {
  onCleanup(() => untrack(cleanup))
}

/**
 * @param {() => void} dependency
 * @param {import("jail/signal").Callback} callback
 * @returns {import("jail/signal").Callback}
 */
export function on(dependency, callback) {
  return (currentValue) => {
    dependency()
    return untrack(() => callback(currentValue))
  }
}

/**
 * @param {import("jail/signal").Callback<any>} callback
 * @param {any} [initialValue]
 * @returns {void}
 */
export function createEffect(callback, initialValue) {
  if (activeNode !== null) {
    const localNode = createNode(initialValue)
    localNode.onupdate = callback
    if (isRunning) {
      NodeQueue.add(localNode)
    } else {
      queueMicrotask(() => updateNode(localNode, false))
    }
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

/**
 * @param {import("jail/signal").Callback<any>} callback
 * @param {any} [initialValue]
 */
export function createComputed(callback, initialValue) {
  const source = createSource(initialValue)
  createEffect(() => setValue(source, callback(source.value)))
  return () => getValue(source)
}

/**
 * @param {import("jail/signal").Node | null} node
 * @param {string | symbol} key
 * @returns {any | undefined}
 */
function lookup(node, key) {
  return node !== null
    ? node.injections !== null && key in node.injections
      ? node.injections[key]
      : lookup(node.parentNode, key)
    : undefined
}

/**
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Source}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

/**
 * @param {import("jail/signal").Source} source
 * @returns {any}
 */
function getValue(source) {
  if (activeNode !== null && activeNode.onupdate !== null) {
    const sourceSlot = source.nodes?.length || 0,
      nodeSlot = activeNode.sources?.length || 0
    if (activeNode.sources === null) {
      activeNode.sources = [source]
      activeNode.sourceSlots = [sourceSlot]
    } else {
      activeNode.sources.push(source)
      activeNode.sourceSlots.push(sourceSlot)
    }
    if (source.nodes === null) {
      source.nodes = [activeNode]
      source.nodeSlots = [nodeSlot]
    } else {
      source.nodes.push(activeNode)
      source.nodeSlots.push(nodeSlot)
    }
  }
  return source.value
}

/**
 * @param {import("jail/signal").Source} source
 * @param {any | import("jail/signal").Callback} nextValue
 */
function setValue(source, nextValue) {
  if (typeof nextValue === "function") {
    nextValue = nextValue(source.value)
  }
  source.value = nextValue
  if (source.nodes?.length) {
    batch(() => {
      for (const node of source.nodes) {
        NodeQueue.add(node)
      }
    })
  }
}

/**
 * @param {any | import("jail/signal").Getter} data
 * @returns {data is import("jail/signal").Getter}
 */
export function isReactive(data) {
  return typeof data === "function"
}

/**
 * @param {any | import("jail/signal").Getter} data
 * @returns {any}
 */
export function toValue(data) {
  return typeof data === "function" ? data() : data
}

/**
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Signal}
 */
export function createSignal(initialValue) {
  const source = createSource(initialValue)
  return function Signal(value) {
    return arguments.length === 1 ? setValue(source, value) : getValue(source)
  }
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorCallbacks = lookup(activeNode, ERROR_INJECTION_KEY)
  if (!errorCallbacks) {
    return reportError(error)
  }
  for (const callback of errorCallbacks) {
    callback(error)
  }
}

/**
 * @param {(error: any) => void} callback
 */
export function catchError(callback) {
  if (activeNode.injections === null) {
    activeNode.injections = { [ERROR_INJECTION_KEY]: [callback] }
  } else {
    activeNode.injections[ERROR_INJECTION_KEY].push(callback)
  }
}

/**
 * @param {import("jail/signal").Cleanup} cleanup
 */
export function onCleanup(cleanup) {
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanup]
  } else {
    activeNode.cleanups.push(cleanup)
  }
}

/**
 * @param {import("jail/signal").Getter} getter
 * @returns {any}
 */
export function untrack(getter) {
  const localNode = activeNode
  activeNode = null
  const result = getter()
  activeNode = localNode
  return result
}

/**
 * @param {import("jail/signal").Getter} callback
 * @returns {any}
 */
function batch(callback) {
  if (isRunning) {
    return callback()
  }
  isRunning = true
  const result = callback()
  queueMicrotask(flush)
  return result
}

function flush() {
  if (isRunning === false) {
    return
  }
  for (const node of NodeQueue) {
    NodeQueue.delete(node)
    updateNode(node, false)
  }
  isRunning = false
}

/**
 * @param {import("jail/signal").Node} node
 * @param {boolean} [complete]
 */
function updateNode(node, complete) {
  cleanNode(node, complete)
  if (node.onupdate === null) {
    return
  }
  const previousNode = activeNode
  activeNode = node
  try {
    node.value = node.onupdate(node.value)
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

/**
 * @param {import("jail/signal").Node} node
 * @param {boolean} [complete]
 */
function cleanNode(node, complete) {
  if (node.sources?.length) {
    while (node.sources.length) {
      const source = node.sources.pop()
      const sourceSlot = node.sourceSlots.pop()
      if (source.nodes?.length) {
        const sourceNode = source.nodes.pop()
        const nodeSlot = source.nodeSlots.pop()
        if (sourceSlot < source.nodes.length) {
          source.nodes[sourceSlot] = sourceNode
          source.nodeSlots[sourceSlot] = nodeSlot
          sourceNode.sourceSlots[nodeSlot] = sourceSlot
        }
      }
    }
  }
  if (node.childNodes?.length) {
    const isUpdatable = node.onupdate !== null
    while (node.childNodes.length) {
      const childNode = node.childNodes.pop()
      cleanNode(
        childNode,
        complete || isUpdatable && childNode.onupdate !== null,
      )
    }
  }
  if (node.cleanups?.length) {
    while (node.cleanups.length) {
      node.cleanups.pop()()
    }
  }
  node.injections = null
  if (complete) {
    node.value = null
    node.parentNode = null
    node.childNodes = null
    node.cleanups = null
    node.onupdate = null
    node.sources = null
    node.sourceSlots = null
  }
}

/**
 * @param {string | symbol} key
 * @param {any} [defaultValue]
 * @returns {any | undefined}
 */
export function inject(key, defaultValue) {
  return lookup(activeNode, key) || defaultValue
}

/**
 * @param {string | symbol} key
 * @param {any} value
 */
export function provide(key, value) {
  if (activeNode.injections === null) {
    activeNode.injections = { [key]: value }
  } else {
    activeNode.injections[key] = value
  }
}

/**
 * @param {((...args: any[]) => any)} callback
 * @returns {((...args: any[]) => any)}
 */
export function createCallback(callback) {
  const localNode = activeNode
  return function Callback(...args) {
    return withNode(localNode, () => callback(...args))
  }
}
