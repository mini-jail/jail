/**
 * @typedef {string | number | symbol} Injectionkey
 * @typedef {{ [key: Injectionkey]: * }} Injections
 * @typedef {() => void} Cleanup
 */
/**
 * @template [Type = *]
 * @typedef {(currentValue: Type) => Type} UpdateFunction
 */
/**
 * @template [Type = *]
 * @typedef {() => Type} Getter
 */
/**
 * @template [Type = *]
 * @typedef {ReadOnlySignal<Type> & WritableSignal<Type>} Signal
 */
/**
 * @template [Type = *]
 * @typedef {() => Type} ReadOnlySignal
 */
/**
 * @template [Type = *]
 * @typedef {{
 *   (update: UpdateFunction<Type>): void
 *   (value: Type): void
 * }} WritableSignal
 */
/**
 * @template [Type = *]
 * @typedef {object} Node
 * @property {Type | undefined | null} value
 * @property {Injections | null} injections
 * @property {Node | null} parentNode
 * @property {Node[] | null} childNodes
 * @property {Cleanup[] | null} cleanups
 * @property {UpdateFunction<Type> | null} onupdate
 * @property {Source[] | null} sources
 * @property {number[] | null} sourceSlots
 */
/**
 * @template [Type = *]
 * @typedef {object} Source
 * @property {Type | undefined} value
 * @property {Node[] | null} nodes
 * @property {number[] | null} nodeSlots
 */

const ActiveNodeIsNull = new Error("activeNode is null.")
const ErrorInjectionKey = Symbol()
/** @type {Set<Node>} */
const NodeQueue = new Set()
let isRunning = false
/** @type {Node | null} */
let activeNode = null

/**
 * @template Type
 * @param {(cleanup: Cleanup) => Type} rootFunction
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
 * @template Type
 * @param {Type} [initialValue]
 * @returns {Node<Type>}
 */
function createNode(initialValue) {
  /** @type {Node<Type>} */
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
 * @param {Cleanup} unmountFunction
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
 * @returns {Cleanup}
 */
/**
 * @template Type
 * @overload
 * @param {UpdateFunction<Type | undefined>} effectFunction
 * @returns {Cleanup}
 */
/**
 * @template Type
 * @overload
 * @param {UpdateFunction<Type>} effectFunction
 * @param {Type} initialValue
 * @returns {Cleanup}
 */
/**
 * @param {UpdateFunction<*>} effectFunction
 * @param {*} [initialValue]
 * @returns {Cleanup}
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
 * @template Type
 * @overload
 * @param {UpdateFunction<Type | undefined>} effectFunction
 * @returns {ReadOnlySignal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {UpdateFunction<Type>} effectFunction
 * @param {Type} initialValue
 * @returns {ReadOnlySignal<Type>}
 */
/**
 * @param {UpdateFunction<*>} effectFunction
 * @param {*} [initialValue]
 * @returns {ReadOnlySignal<*>}
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
 * @param {Node | null} node
 * @param {Injectionkey} key
 * @returns {* | undefined}
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
 * @returns {Source<Type>}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

/**
 * @template Type
 * @param {Source<Type>} source
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
 * @template Type
 * @overload
 * @param {Source<Type>} source
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
 * @param {Source<Type>} source
 * @param {*} nextValue
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
 * @template Type
 * @overload
 * @returns {Signal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {Type} initialValue
 * @returns {Signal<Type>}
 */
/**
 * @template Type
 * @param {*} [initialValue]
 * @returns {Signal<*>}
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
 * @template [Type = *]
 * @param {Type} error
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
 * @template [Type = *]
 * @param {(error: Type) => void} errorFunction
 * @returns {void}
 */
export function catchError(errorFunction) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [ErrorInjectionKey]: [errorFunction] }
  } else {
    activeNode.injections[ErrorInjectionKey].push(errorFunction)
  }
}

/**
 * @param {Cleanup} cleanupFunction
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
 * @param {Getter<Type>} getter
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
 * @param {Getter<Type>} getter
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
  for (const node of NodeQueue) {
    NodeQueue.delete(node)
    updateNode(node, false)
  }
  isRunning = false
}

/**
 * @param {Node<*>} node
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
 * @param {Node} node
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
 * @template Type
 * @overload
 * @param {Injectionkey} key
 * @returns {Type | undefined}
 */
/**
 * @template Type
 * @overload
 * @param {Injectionkey} key
 * @param {Type} defaultValue
 * @returns {Type}
 */
/**
 * @param {Injectionkey} key
 * @param {*} [defaultValue]
 * @returns {* | undefined}
 */
export function inject(key, defaultValue) {
  if (activeNode === null) {
    throw ActiveNodeIsNull
  }
  return lookup(activeNode, key) ?? defaultValue
}

/**
 * @template Type
 * @param {Injectionkey} key
 * @param {Type} value
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
