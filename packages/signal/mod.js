/**
 * @template [Type = any]
 * @typedef {(currentValue: Type) => Type} Callback
 */

/**
 * @typedef {() => void} Cleanup
 * @typedef {{
 *   [key: string | symbol]: any
 * }} InjectionMap
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   (): Type
 *   (value: Type): void
 *   (update: Callback<Type>): void
 * }} Signal
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   value: Type | undefined
 *   nodes: Node[] | null
 *   nodeSlots: number[] | null
 * }} Source
 */

/**
 * @template [Type = any]
 * @typedef {{
 *   value: Type | undefined | null
 *   injectionMap: InjectionMap | null
 *   parentNode: Node | null
 *   childNodes: Node[] | null
 *   cleanups: Cleanup[] | null
 *   onupdate: Callback<Type> | null
 *   sources: Source[] | null
 *   sourceSlots: number[] | null
 * }} Node
 */

const ErrorInjectionKey = Symbol()
/**
 * @type {Set<Node>}
 */
const NodeQueue = new Set()
let isRunning = false
/**
 * @type {Node | null}
 */
let activeNode = null

/**
 * @template Type
 * @overload
 * @param {(cleanup: Cleanup) => Type} callback
 * @returns {Type | undefined}
 */
/**
 * @param {(cleanup: Cleanup | undefined) => any} callback
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
 * @returns {Node | null}
 */
export function nodeRef() {
  return activeNode
}

/**
 * @template Type
 * @param {Node} node
 * @param {() => Type} callback
 * @returns {Type | undefined}
 */
export function withNode(node, callback) {
  const localNode = activeNode
  activeNode = node
  let result
  try {
    result = callback()
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = localNode
  }
  return result
}

/**
 * @template Type
 * @param {Type} [initialValue]
 * @returns {Node<Type>}
 */
function createNode(initialValue) {
  /**
   * @type {Node<Type>}
   */
  const localNode = {
    value: initialValue,
    parentNode: activeNode,
    childNodes: null,
    injectionMap: null,
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
 * @param {Cleanup} cleanup
 */
export function onUnmount(cleanup) {
  onCleanup(() => untrack(cleanup))
}

/**
 * @template Type
 * @param {() => void} dependency
 * @param {Callback<Type>} callback
 * @returns {Callback<Type>}
 */
export function on(dependency, callback) {
  return (currentValue) => {
    dependency()
    return untrack(() => callback(currentValue))
  }
}

/**
 * @overload
 * @param {() => void} callback
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {Callback<Type | undefined>} callback
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {Callback<Type>} callback
 * @param {Type} initialValue
 * @returns {void}
 */
/**
 * @param {Callback<any>} callback
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
 * @template Type
 * @overload
 * @param {Callback<Type | undefined>} callback
 * @returns {() => Type | undefined}
 */
/**
 * @template Type
 * @overload
 * @param {Callback<Type>} callback
 * @param {Type} initialValue
 * @returns {() => Type}
 */
/**
 * @param {Callback<any>} callback
 * @param {any} [initialValue]
 */
export function createComputed(callback, initialValue) {
  const source = createSource(initialValue)
  createEffect(() => setValue(source, callback(source.value)))
  return () => getValue(source)
}

/**
 * @template {keyof InjectionMap} Key
 * @param {Node | null} node
 * @param {Key} key
 * @returns {InjectionMap[Key] | undefined}
 */
function lookup(node, key) {
  return node !== null
    ? node.injectionMap !== null && key in node.injectionMap
      ? node.injectionMap[key]
      : lookup(node.parentNode, key)
    : undefined
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
 * @returns {Type}
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
 * @template Type
 * @param {Source<Type>} source
 * @param {Type | Callback<Type>} nextValue
 */
function setValue(source, nextValue) {
  if (typeof nextValue === "function") {
    nextValue = nextValue(source.value)
  }
  if (source.value !== nextValue) {
    source.value = nextValue
    queueNodes(source)
  }
}

/**
 * @template Type
 * @param {Type | (() => Type)} data
 * @returns {data is () => Type}
 */
export function isReactive(data) {
  return typeof data === "function"
}

/**
 * @template Type
 * @param {Type | (() => Type)} data
 * @returns {Type}
 */
export function toValue(data) {
  return typeof data === "function" ? data() : data
}

/**
 * @param {Source} source
 */
function queueNodes(source) {
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
 * @param {any} [initialValue]
 * @returns {Signal<any>}
 */
export function createSignal(initialValue) {
  const source = createSource(initialValue)
  return function Signal(value) {
    return arguments.length === 1 ? setValue(source, value) : getValue(source)
  }
}

/**
 * @template [Type = unknown]
 * @param {Type} error
 */
function handleError(error) {
  const errorCallbacks = inject(ErrorInjectionKey)
  if (!errorCallbacks) {
    return reportError(error)
  }
  for (const callback of errorCallbacks) {
    callback(error)
  }
}

/**
 * @template [Type = unknown]
 * @param {(error: Type) => void} callback
 */
export function catchError(callback) {
  if (activeNode.injectionMap === null) {
    activeNode.injectionMap = { [ErrorInjectionKey]: [callback] }
  } else {
    activeNode.injectionMap[ErrorInjectionKey].push(callback)
  }
}

/**
 * @param {Cleanup} cleanup
 */
export function onCleanup(cleanup) {
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanup]
  } else {
    activeNode.cleanups.push(cleanup)
  }
}

/**
 * @template Type
 * @param {() => Type} callback
 * @returns {Type}
 */
export function untrack(callback) {
  const localNode = activeNode
  activeNode = null
  const result = callback()
  activeNode = localNode
  return result
}

/**
 * @template Type
 * @param {() => Type} callback
 * @returns {Type}
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
 * @param {Node} node
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
 */
function cleanSources(node) {
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

/**
 * @param {Node} node
 * @param {boolean} [complete]
 */
function cleanChildNodes(node, complete) {
  const hasUpdateHandler = node.onupdate !== null
  while (node.childNodes.length) {
    const childNode = node.childNodes.pop()
    cleanNode(
      childNode,
      complete || hasUpdateHandler && childNode.onupdate !== null,
    )
  }
}

/**
 * @param {Node} node
 * @param {boolean} [complete]
 */
function cleanNode(node, complete) {
  if (node.sources?.length) {
    cleanSources(node)
  }
  if (node.childNodes?.length) {
    cleanChildNodes(node, complete)
  }
  if (node.cleanups?.length) {
    while (node.cleanups.length) {
      node.cleanups.pop()()
    }
  }
  node.injectionMap = null
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
 * @template {keyof InjectionMap} Key
 * @overload
 * @param {Key} key
 * @returns {InjectionMap[Key] | undefined}
 */
/**
 * @template {keyof InjectionMap} Key
 * @overload
 * @param {Key} key
 * @param {InjectionMap[Key]} defaultValue
 * @returns {NonNullable<InjectionMap[Key]>}
 */
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
 * @param {Type} defaultValue
 * @returns {Type}
 */
/**
 * @param {string | symbol} key
 * @param {any} [defaultValue]
 * @returns {any | undefined}
 */
export function inject(key, defaultValue) {
  return lookup(activeNode, key) || defaultValue
}

/**
 * @template {keyof InjectionMap} Key
 * @overload
 * @param {Key} key
 * @param {NonNullable<InjectionMap[Key]>} value
 */
/**
 * @template Type
 * @overload
 * @param {string | symbol} key
 * @param {Type} value
 */
/**
 * @param {string | symbol} key
 * @param {any} value
 */
export function provide(key, value) {
  if (activeNode.injectionMap === null) {
    activeNode.injectionMap = { [key]: value }
  } else {
    activeNode.injectionMap[key] = value
  }
}

/**
 * @template {((...args: any[]) => any)} T
 * @param {T} callback
 * @returns {T}
 */
export function createCallback(callback) {
  const localNode = activeNode
  return function Callback(...args) {
    return withNode(localNode, () => callback(...args))
  }
}
