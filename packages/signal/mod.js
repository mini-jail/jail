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
 * @typedef {{ value: any }} Resolvable
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

/**
 * @returns {Node}
 */
function createNode() {
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
  const node = createNode()
  try {
    activeNode = node
    return fn(() => cleanNode(node, true))
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
      if (activeNode?.fn) {
        let effects = effectMap.get(this)
        if (effects === undefined) {
          effectMap.set(this, effects = new Set())
        }
        effects.add(activeNode)
        if (activeNode.signals === null) {
          activeNode.signals = [this]
        } else if (!activeNode.signals.includes(this)) {
          activeNode.signals.push(this)
        }
      }
      return value
    },
    set value(newValue) {
      if (value !== newValue) {
        value = newValue
        effectMap.get(this)?.forEach(queueNode)
      }
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
  return {
    get value() {
      return signal.value
    },
  }
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
 * @overload
 * @param {() => void} fn
 * @returns {void}
 */
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
/**
 * @param {(value: any) => any} fn
 * @param {any} [value]
 * @returns {void}
 */
export function createEffect(fn, value) {
  const node = createNode()
  node.fn = fn
  node.value = value
  queueNode(node)
}

/**
 * @param {Node} node
 * @param {boolean} dispose
 */
function cleanNode(node, dispose) {
  if (node.signals?.length) {
    let signal = node.signals.pop()
    while (signal) {
      effectMap.get(signal)?.delete(node)
      signal = node.signals.pop()
    }
  }
  if (node.children?.length) {
    let childNode = node.children.pop()
    while (childNode) {
      cleanNode(childNode, childNode.fn ? true : dispose)
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
function updateNode(node) {
  cleanNode(node, false)
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
 * @param {Node} node
 */
function queueNode(node) {
  effectQueue.add(node)
  if (isRunning === false) {
    isRunning = true
    queueMicrotask(batch)
  }
}

function batch() {
  for (const effect of effectQueue) {
    updateNode(effect)
  }
  effectQueue.clear()
  isRunning = false
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
