/**
 * @template [Type = unknown]
 * @typedef {{
 *   value: Type | undefined
 *   parent: Node | null
 *   children: Node[] | null
 *   signals: Signal[] | null
 *   context: Record<string | symbol, any> | null
 *   cleanups: Cleanup[] | null
 *   fn: ((value: Type) =>  Type)  | null
 * }} Node
 */
/**
 * @typedef {() => void} Cleanup
 */
/**
 * @template [Type = unknown]
 * @typedef {{ value: Type }} Signal
 */
/**
 * @template [Type = unknown]
 * @typedef {{ readonly value: Type }} ReadonlySignal
 */
/**
 * @template Type
 * @typedef {Type extends Resolvable ? Type["value"] : Type} Resolved
 */
/**
 * @typedef {{ value: unknown }} Resolvable
 */
/**
 * @type {WeakMap<Signal, Set<Node>>}
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

export function getNode() {
  if (activeNode === null) {
    throw new Error("getNode(): activeNode is null!")
  }
  return activeNode
}

/**
 * @returns {Node}
 */
export function createNode() {
  /**
   * @type {Node}
   */
  const node = {
    children: null,
    cleanups: null,
    context: null,
    fn: null,
    parent: null,
    signals: null,
    value: undefined,
  }
  if (activeNode) {
    node.parent = activeNode
    if (activeNode.children === null) {
      activeNode.children = [node]
    } else {
      activeNode.children.push(node)
    }
  }
  return node
}

/**
 * @template Type
 * @param {(cleanup: Cleanup) => Type} fn
 */
export function createRoot(fn) {
  const node = createNode()
  try {
    activeNode = node
    return fn(() => clean(node, true))
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = node.parent
  }
}

/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} value
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
 */
export function inject(key, value) {
  return lookup(activeNode, key) ?? value
}

/**
 * @param {Node | undefined | null} node
 * @param {string | symbol} key
 */
function lookup(node, key) {
  return node == null
    ? undefined
    : node.context !== null && key in node.context
    ? node.context[key]
    : lookup(node.parent, key)
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
/**
 * @template Type
 * @param {Type} [value]
 * @returns {Signal<Type | undefined>}
 */
export function createSignal(value) {
  return {
    get value() {
      sub(this)
      return value
    },
    set value(newValue) {
      if (value !== newValue) {
        value = newValue
        pub(this)
      }
    },
  }
}

/**
 * @template Type
 * @param {Signal<Type>} signal
 * @returns {ReadonlySignal<Type>}
 */
export function createReadonly(signal) {
  return {
    get value() {
      return signal.value
    },
  }
}

/**
 * @template Type
 * @overload
 * @param {(value: Type | undefined) => Type} fn
 * @returns {ReadonlySignal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {(value: Type) => Type} fn
 * @param {Type} value
 * @returns {ReadonlySignal<Type>}
 */
/**
 * @template Type
 * @param {(value: Type | undefined) => Type} fn
 * @param {Type} [value]
 * @returns {ReadonlySignal<Type | undefined>}
 */
export function createMemo(fn, value) {
  const signal = createSignal(value)
  createEffect(() => {
    signal.value = fn(untrack(() => signal.value))
  })
  return createReadonly(signal)
}

/**
 * @template Type
 * @param {() => Type} fn
 * @returns {Type}
 */
export function untrack(fn) {
  const node = activeNode
  activeNode = null
  const result = fn()
  activeNode = node
  return result
}

/**
 * @template Type
 * @overload
 * @param {(value: Type | undefined) => Type} fn
 * @returns {void}
 */
/**
 * @template Type
 * @overload
 * @param {(value: Type) => Type} fn
 * @param {Type} value
 * @returns {void}
 */
export function createEffect(fn, value) {
  const node = createNode()
  node.fn = fn
  node.value = value
  if (isRunning) {
    effectQueue.add(node)
  } else {
    queueMicrotask(() => update(node))
  }
}

/**
 * @param {Node} node
 * @param {boolean} dispose
 */
export function clean(node, dispose) {
  if (node.signals?.length) {
    let signal = node.signals.pop()
    while (signal) {
      unsub(signal, node)
      signal = node.signals.pop()
    }
  }
  if (node.children?.length) {
    let childNode = node.children.pop()
    while (childNode) {
      clean(childNode, childNode.fn ? true : dispose)
      childNode = node.children.pop()
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
    node.signals = null
    node.children = null
    node.fn = null
    node.cleanups = null
  }
}

/**
 * @param {Node} node
 */
function update(node) {
  clean(node, false)
  if (node.fn === null) {
    return
  }
  const prevNode = activeNode
  try {
    activeNode = node
    node.value = node.fn(node.value)
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = prevNode
  }
}

/**
 * @param {Cleanup} fn
 */
export function onCleanup(fn) {
  if (activeNode === null) {
    throw new Error("onCleanup(fn): activeNode is null!")
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [fn]
  } else {
    activeNode.cleanups.push(fn)
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
 * @param {Signal} signal
 */
export function sub(signal) {
  if (activeNode?.fn) {
    let effects = effectMap.get(signal)
    if (effects === undefined) {
      effectMap.set(signal, effects = new Set())
    }
    effects.add(activeNode)
    if (activeNode.signals === null) {
      activeNode.signals = [signal]
    } else if (!activeNode.signals.includes(signal)) {
      activeNode.signals.push(signal)
    }
  }
}

/**
 * @param {Signal} signal
 * @param {Node} node
 */
export function unsub(signal, node) {
  effectMap.get(signal)?.delete(node)
}

/**
 * @param {Signal} signal
 */
export function pub(signal) {
  effectMap.get(signal)?.forEach((node) => queue(node))
}

/**
 * @param {Node} node
 */
function queue(node) {
  effectQueue.add(node)
  if (isRunning === false) {
    isRunning = true
    queueMicrotask(batch)
  }
}

function batch() {
  for (const effect of effectQueue) {
    update(effect)
  }
  effectQueue.clear()
  isRunning = false
}

/**
 * @param {any} data
 * @returns {data is { value: any }}
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
