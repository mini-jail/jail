/// <reference path="./types.d.ts" />
const ActiveNodeIsNull = new Error("activeNode is null.")
export const errorSymbol = Symbol("Error")
/**
 * @type {Set<space.Node>}
 */
const nodeQueue = new Set()
let isRunning = false
/** @type {space.Node | null} */
let activeNode = null

/**
 * @template Type
 * @param {(cleanup: space.Cleanup) => Type} rootFunction
 * @returns {Type | undefined}
 */
export function createRoot(rootFunction) {
  const node = createNode()
  try {
    activeNode = node
    return batch(() => rootFunction(() => cleanNode(node, true)))
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = node.parentNode
  }
}

/**
 * @param {any} [initialValue]
 * @returns {space.Node}
 */
function createNode(initialValue) {
  /** @type {space.Node} */
  const node = {
    value: initialValue,
    parentNode: null,
    childNodes: null,
    injections: null,
    cleanups: null,
    onupdate: null,
    sources: null,
    sourceSlots: null,
  }
  if (activeNode !== null) {
    node.parentNode = activeNode
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
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  createEffect(() => untrack(mountFunction))
}

/**
 * @param {space.Cleanup} unmountFunction
 */
export function onUnmount(unmountFunction) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  onCleanup(() => untrack(unmountFunction))
}

/**
 * @overload
 * @param {() => void} effectFunction
 * @returns {space.Cleanup}
 */
/**
 * @template Type
 * @overload
 * @param {space.UpdateFunction<Type | undefined>} effectFunction
 * @returns {space.Cleanup}
 */
/**
 * @template Type
 * @overload
 * @param {space.UpdateFunction<Type>} effectFunction
 * @param {Type} initialValue
 * @returns {space.Cleanup}
 */
/**
 * @param {space.UpdateFunction<any>} effectFunction
 * @param {any} [initialValue]
 * @returns {space.Cleanup}
 */
export function createEffect(effectFunction, initialValue) {
  const node = createNode(initialValue)
  node.onupdate = effectFunction
  if (isRunning) {
    nodeQueue.add(node)
  } else {
    queueMicrotask(() => updateNode(node, false))
  }
  return () => cleanNode(node, true)
}

/**
 * @template Type
 * @overload
 * @param {space.UpdateFunction<Type | undefined>} effectFunction
 * @returns {space.ReadOnlySignal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {space.UpdateFunction<Type>} effectFunction
 * @param {Type} initialValue
 * @returns {space.ReadOnlySignal<Type>}
 */
/**
 * @param {space.UpdateFunction<any>} effectFunction
 * @param {any} [initialValue]
 * @returns {space.ReadOnlySignal<any>}
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
 * @param {space.Node | null} node
 * @param {space.Injectionkey} key
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
 * @template Type
 * @param {Type} [initialValue]
 * @returns {space.Source<Type>}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

/**
 * @template Type
 * @param {space.Source<Type>} source
 * @returns {Type | undefined}
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
      // @ts-expect-error: activeNode.sourceSlots will be not null
      activeNode.sourceSlots.push(sourceSlot)
    }
    if (source.nodes === null) {
      source.nodes = [activeNode]
      source.nodeSlots = [nodeSlot]
    } else {
      source.nodes.push(activeNode)
      // @ts-expect-error: source.nodeSlots will be not null
      source.nodeSlots.push(nodeSlot)
    }
  }
  return source.value
}

/**
 * @template Type
 * @overload
 * @param {space.Source<Type>} source
 * @param {Type} nextValue
 */
/**
 * @template Type
 * @overload
 * @param {Source<Type>} source
 * @param {UpdateFunction<Type>} nextValue
 */
/**
 * @template Type
 * @param {space.Source<Type>} source
 * @param {Type} nextValue
 */
function setSourceValue(source, nextValue) {
  if (typeof nextValue === "function") {
    nextValue = nextValue(source.value)
  }
  source.value = nextValue
  if (source.nodes?.length) {
    batch(() => {
      // @ts-expect-error: source.nodes will be not null
      for (const node of source.nodes) {
        nodeQueue.add(node)
      }
    })
  }
}

/**
 * @template Type
 * @overload
 * @returns {space.Signal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {Type} initialValue
 * @returns {space.Signal<Type>}
 */
/**
 * @template Type
 * @param {any} [initialValue]
 * @returns {space.Signal<any>}
 */
export function createSignal(initialValue) {
  const source = createSource(initialValue)
  return function Signal() {
    if (arguments.length === 0) {
      return getSourceValue(source)
    }
    setSourceValue(source, arguments[0])
  }
}

/**
 * @template [Type = any]
 * @param {Type} error
 */
function handleError(error) {
  const errorFunctions = lookup(activeNode, errorSymbol)
  if (!errorFunctions) {
    return reportError(error)
  }
  for (const errorFunction of errorFunctions) {
    errorFunction(error)
  }
}

/**
 * @template [Type = any]
 * @param {(error: Type) => void} errorFunction
 * @returns {void}
 */
export function catchError(errorFunction) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [errorSymbol]: [errorFunction] }
  } else {
    activeNode.injections[errorSymbol]?.push(errorFunction)
  }
}

/**
 * @param {space.Cleanup} cleanupFunction
 */
export function onCleanup(cleanupFunction) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanupFunction]
  } else {
    activeNode.cleanups.push(cleanupFunction)
  }
}

/**
 * @template Type
 * @param {space.Getter<Type>} getter
 * @returns {Type}
 */
export function untrack(getter) {
  const previousNode = activeNode
  activeNode = null
  const result = getter()
  activeNode = previousNode
  return result
}

/**
 * @template Type
 * @param {space.Getter<Type>} getter
 * @returns {Type}
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
  for (const node of nodeQueue) {
    nodeQueue.delete(node)
    updateNode(node, false)
  }
  isRunning = false
}

/**
 * @param {space.Node} node
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
 * @param {space.Node} node
 * @param {boolean} [complete]
 */
function cleanNode(node, complete) {
  if (node.sources?.length) {
    while (node.sources.length) {
      /** @type {space.Source} */
      // @ts-expect-error: node.sources will be not null
      const source = node.sources.pop()
      /** @type {number} */
      // @ts-expect-error: node.sourceSlots will be not null
      const sourceSlot = node.sourceSlots.pop()
      if (source.nodes?.length) {
        /** @type {space.Node} */
        // @ts-expect-error: source.nodes will be not null
        const sourceNode = source.nodes.pop()
        /** @type {number} */
        // @ts-expect-error: source.nodeSlots will be not null
        const nodeSlot = source.nodeSlots.pop()
        if (sourceSlot < source.nodes.length) {
          source.nodes[sourceSlot] = sourceNode
          // @ts-expect-error: source.nodeSlots will be not null
          source.nodeSlots[sourceSlot] = nodeSlot
          // @ts-expect-error: sourceNode.sourceSlots will be not null
          sourceNode.sourceSlots[nodeSlot] = sourceSlot
        }
      }
    }
  }
  if (node.childNodes?.length) {
    const isUpdatable = node.onupdate !== null
    while (node.childNodes.length) {
      /** @type {space.Node} */
      // @ts-expect-error: node.childNodes.pop() will return a node here
      const childNode = node.childNodes.pop()
      cleanNode(
        childNode,
        complete || isUpdatable && childNode.onupdate !== null,
      )
    }
  }
  if (node.cleanups?.length) {
    while (node.cleanups.length) {
      node.cleanups.pop()?.()
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
 * @template {space.Injectionkey} Key
 * @overload
 * @param {Key} key
 * @returns {space.Injections[Key] | undefined}
 */
/**
 * @template T
 * @template {space.Injectionkey | string | number | symbol} K
 * @overload
 * @param {K} key
 * @param {T} defaultValue
 * @returns {space.Injections[K] | T}
 */
/**
 * @param {any} key
 * @param {any} [defaultValue]
 * @returns {any | undefined}
 */
export function inject(key, defaultValue) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  return lookup(activeNode, key) ?? defaultValue
}

/**
 * @template {space.Injectionkey} Key
 * @overload
 * @param {Key} key
 * @param {space.Injections[Key]} value
 * @returns {void}
 */
/**
 * @template T
 * @overload
 * @param {string | number | symbol} key
 * @param {T} value
 * @returns {void}
 */
/**
 * @param {string | number | symbol} key
 * @param {any} value
 * @returns {void}
 */
export function provide(key, value) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [key]: value }
  } else {
    activeNode.injections[key] = value
  }
}
