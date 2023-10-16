/// <reference types="./mod.d.ts" />
const ErrorInjectionKey = Symbol()
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
 * @param {(cleanup: import("jail/signal").Cleanup) => any} rootFunction
 * @returns {any | undefined}
 */
export function createRoot(rootFunction) {
  const previousNode = activeNode, node = createNode()
  try {
    activeNode = node
    return batch(() => rootFunction(() => cleanNode(node, true)))
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

/**
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Node}
 */
function createNode(initialValue) {
  const node = {
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
      activeNode.childNodes = [node]
    } else {
      activeNode.childNodes.push(node)
    }
  }
  return node
}

/**
 * @param {() => void} mountFunction
 */
export function onMount(mountFunction) {
  throwIfActiveNodeIsNull()
  createEffect(() => untrack(mountFunction))
}

/**
 * @param {import("jail/signal").Cleanup} unmountFunction
 */
export function onUnmount(unmountFunction) {
  throwIfActiveNodeIsNull()
  onCleanup(() => untrack(unmountFunction))
}

/**
 * @param {import("jail/signal").UpdateFunction} effectFunction
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Cleanup}
 */
export function createEffect(effectFunction, initialValue) {
  const node = createNode(initialValue)
  node.onupdate = effectFunction
  if (isRunning) {
    NodeQueue.add(node)
  } else {
    queueMicrotask(() => updateNode(node, false))
  }
  return () => cleanNode(node, true)
}

/**
 * @param {import("jail/signal").UpdateFunction} effectFunction
 * @param {any} [initialValue]
 */
export function createComputed(effectFunction, initialValue) {
  const source = createSource(initialValue)
  createEffect(() => {
    const nextValue = effectFunction(source.value)
    setSourceValue(source, nextValue)
  })
  return () => getSourceValue(source)
}

/**
 * @param {import("jail/signal").Node | null} node
 * @param {string | symbol} key
 * @returns {any | undefined}
 */
function lookup(node, key) {
  if (node === null) {
    return
  }
  if (node.injections !== null && key in node.injections) {
    return node.injections[key]
  }
  return lookup(node.parentNode, key)
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
function getSourceValue(source) {
  if (activeNode !== null && activeNode.onupdate !== null) {
    const sourceSlot = source.nodes?.length ?? 0,
      nodeSlot = activeNode.sources?.length ?? 0
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
 * @param {any | import("jail/signal").UpdateFunction} nextValue
 */
function setSourceValue(source, nextValue) {
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
 * @param {any} [initialValue]
 * @returns {import("jail/signal").Signal}
 */
export function createSignal(initialValue) {
  const source = createSource(initialValue)
  return function Signal(value) {
    if (arguments.length === 0) {
      return getSourceValue(source)
    }
    setSourceValue(source, value)
  }
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorFunctions = lookup(activeNode, ErrorInjectionKey)
  if (!errorFunctions) {
    return reportError(error)
  }
  for (const errorFunction of errorFunctions) {
    errorFunction(error)
  }
}

/**
 * @param {(error: any) => void} errorFunction
 */
export function catchError(errorFunction) {
  throwIfActiveNodeIsNull()
  if (activeNode.injections === null) {
    activeNode.injections = { [ErrorInjectionKey]: [errorFunction] }
  } else {
    activeNode.injections[ErrorInjectionKey].push(errorFunction)
  }
}

/**
 * @param {import("jail/signal").Cleanup} cleanupFunction
 */
export function onCleanup(cleanupFunction) {
  throwIfActiveNodeIsNull()
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanupFunction]
  } else {
    activeNode.cleanups.push(cleanupFunction)
  }
}

/**
 * @param {import("jail/signal").Getter} getter
 * @returns {any}
 */
export function untrack(getter) {
  const previousNode = activeNode
  activeNode = null
  const result = getter()
  activeNode = previousNode
  return result
}

/**
 * @param {import("jail/signal").Getter} getter
 * @returns {any}
 */
function batch(getter) {
  if (isRunning) {
    return getter()
  }
  isRunning = true
  const result = getter()
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
  throwIfActiveNodeIsNull()
  return lookup(activeNode, key) ?? defaultValue
}

/**
 * @param {string | symbol} key
 * @param {any} value
 */
export function provide(key, value) {
  throwIfActiveNodeIsNull()
  if (activeNode.injections === null) {
    activeNode.injections = { [key]: value }
  } else {
    activeNode.injections[key] = value
  }
}

function throwIfActiveNodeIsNull() {
  if (activeNode === null) {
    throw new Error("activeNode is null.")
  }
}
