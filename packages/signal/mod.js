/**
 * @template [Type = any]
 * @typedef {{
 *   function?: (value: Type) =>  Type
 *   value?: Type
 *   parent?: Node
 *   children?: Node[]
 *   signals?: Signal[]
 *   context?: Record<string | symbol, any>
 *   cleanups?: Cleanup[]
 * }} Node
 */
/**
 * @typedef {() => void} Cleanup
 */
/**
 * @template [Type = any]
 * @typedef {{ value: Type }} Signal
 */
/**
 * @template [Type = any]
 * @typedef {{ readonly value: Type }} ReadonlySignal
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
 * @type {Node | undefined}
 */
let currentNode

export function getNode() {
  if (currentNode === undefined) {
    throw new Error("getNode() called without parent.")
  }
  return currentNode
}

/**
 * @template Type
 * @param {(cleanup: Cleanup) => Type} fn
 */
export function root(fn) {
  /** @type {Node} */
  const node = Object.create(null),
    prevNode = currentNode
  if (currentNode) {
    node.parent = currentNode
    if (currentNode.children === undefined) {
      currentNode.children = [node]
    } else {
      currentNode.children.push(node)
    }
  }
  try {
    currentNode = node
    return fn(() => clean(node, true))
  } catch (error) {
    handleError(error)
  } finally {
    currentNode = prevNode
  }
}

/**
 * @template Type
 * @param {string | symbol} key
 * @param {Type} value
 */
export function provide(key, value) {
  if (currentNode === undefined) {
    throw new Error("provide(key, value) called without parent.")
  }
  if (currentNode.context === undefined) {
    currentNode.context = {}
  }
  currentNode.context[key] = value
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
  return lookup(currentNode, key) ?? value
}

/**
 * @param {Node | undefined | null} node
 * @param {string | symbol} key
 */
function lookup(node, key) {
  return node == null
    ? undefined
    : node.context !== undefined && key in node.context
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
export function signal(value) {
  return {
    get value() {
      subscribe(this)
      return value
    },
    set value(newValue) {
      commit(this)
      value = newValue
    },
  }
}

/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @returns {ReadonlySignal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @param {Type} value
 * @returns {ReadonlySignal<Type>}
 */
/**
 * @template Type
 * @param {() => Type} fn
 * @param {Type} [value]
 * @returns {ReadonlySignal<Type | undefined>}
 */
export function memo(fn, value) {
  const data = signal(value)
  effect(() => {
    data.value = fn()
  })
  return {
    get value() {
      return data.value
    },
  }
}

/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @returns {ReadonlySignal<Type | undefined>}
 */
/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @param {Type} value
 * @returns {ReadonlySignal<Type>}
 */
/**
 * @template Type
 * @overload
 * @param {() => Type} fn
 * @param {Type} value
 * @param {number} timeout
 * @returns {ReadonlySignal<Type>}
 */
/**
 * @template Type
 * @param {() => Type} fn
 * @param {Type} [value]
 * @param {number} [timeout]
 * @returns {ReadonlySignal<Type | undefined>}
 */
export function deferred(fn, value, timeout) {
  const data = signal(value)
  effect((handle) => {
    const value = fn()
    cancelIdleCallback(handle)
    return requestIdleCallback(() => data.value = value, {
      timeout,
    })
  })
  return {
    get value() {
      return data.value
    },
  }
}

/**
 * @template Type
 * @param {() => any} fn
 * @param {(value: Type) => Type} cb
 * @returns {(value: Type) => Type}
 */
export function on(fn, cb) {
  return function (value) {
    fn()
    return untrack(() => cb(value))
  }
}

/**
 * @template Type
 * @param {(value: Type) => Type} fn
 * @param {Signal[]} signals
 * @returns {(value: Type) => Type}
 */
export function deps(fn, ...signals) {
  return function (value) {
    signals.forEach((signal) => signal.value)
    return untrack(() => fn(value))
  }
}

/**
 * @template Type
 * @param {() => Type} fn
 * @returns {Type}
 */
export function untrack(fn) {
  const node = currentNode
  currentNode = undefined
  const result = fn()
  currentNode = node
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
export function effect(fn, value) {
  /** @type {Node} */
  const node = Object.create(null)
  node.function = fn
  if (value !== undefined) {
    node.value = value
  }
  if (currentNode) {
    node.parent = currentNode
    if (currentNode.children === undefined) {
      currentNode.children = [node]
    } else {
      currentNode.children.push(node)
    }
  }
  queue(node)
}

/**
 * @param {Node} node
 * @param {boolean} dispose
 */
function clean(node, dispose) {
  let i
  if (node.signals?.length) {
    i = node.signals.length
    while (i--) {
      const effects = effectMap.get(node.signals[i])
      if (effects) {
        effects.delete(node)
        if (dispose) {
          effectMap.delete(node.signals[i])
        }
      }
    }
    node.signals.length = 0
  }
  if (node.children?.length) {
    i = node.children.length
    while (i--) {
      clean(node.children[i], node.children[i].function ? true : dispose)
    }
    node.children.length = 0
  }
  if (node.cleanups?.length) {
    i = node.cleanups.length
    while (i--) {
      node.cleanups[i]()
    }
    node.cleanups.length = 0
  }
  delete node.context
  if (dispose) {
    delete node.value
    delete node.signals
    delete node.parent
    delete node.children
    delete node.function
    delete node.cleanups
  }
}

/**
 * @param {Node} node
 */
function update(node) {
  clean(node, false)
  if (node.function == null) {
    return
  }
  const prevNode = currentNode
  try {
    currentNode = node
    node.value = node.function(node.value)
  } catch (error) {
    handleError(error)
  } finally {
    currentNode = prevNode
  }
}

/**
 * @param {Cleanup} fn
 */
export function cleanup(fn) {
  if (currentNode === undefined) {
    throw new Error("cleanup(fn) called without parent.")
  }
  if (currentNode.cleanups) {
    currentNode.cleanups.push(fn)
  } else {
    currentNode.cleanups = [fn]
  }
}

/**
 * @param {(error: any) => void} fn
 */
export function catchError(fn) {
  if (currentNode === undefined) {
    throw new Error(`catchError(fn): called without parent.`)
  }
  if (currentNode.context === undefined) {
    currentNode.context = {}
  }
  if (currentNode.context[errorKey]) {
    currentNode.context[errorKey].push(fn)
  } else {
    currentNode.context[errorKey] = [fn]
  }
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorFunctions = lookup(currentNode, errorKey)
  if (!errorFunctions) {
    return reportError(error)
  }
  for (const errorFunction of errorFunctions) {
    errorFunction(error)
  }
}

/**
 * @param {Signal} signal
 */
function subscribe(signal) {
  if (currentNode?.function) {
    let effects = effectMap.get(signal)
    if (effects === undefined) {
      effects = new Set()
      effectMap.set(signal, effects)
    }
    effects.add(currentNode)
    if (currentNode.signals === undefined) {
      currentNode.signals = [signal]
    } else {
      currentNode.signals.push(signal)
    }
  }
}

/**
 * @param {Signal} signal
 */
function commit(signal) {
  effectMap.get(signal)?.forEach(queue)
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
  if (isRunning) {
    for (const effect of effectQueue) {
      update(effect)
    }
    effectQueue.clear()
    isRunning = false
  }
}
