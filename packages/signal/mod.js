/// <reference types="./mod.d.ts" />
/** @type {"jail/signal/error"} */
const Error = Symbol()
/**
 * @type {Set<jail.Node>}
 */
const NodeQueue = new Set()
let isRunning = false
/**
 * @type {jail.Node | null}
 */
let activeNode = null

/**
 * @template T
 * @param {(cleanup: jail.Cleanup) => T | void} callback
 * @returns {T | void}
 */
export function createRoot(callback) {
  const localNode = activeNode = createNode()
  try {
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : clean.bind(localNode, true),
      )
    )
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = localNode.parentNode
  }
}

/**
 * @returns {jail.Node | null}
 */
export function nodeRef() {
  return activeNode
}

/**
 * @template T
 * @param {jail.Node} node
 * @param {() => T} callback
 * @returns {T}
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
 * @template T
 * @param {T} [initialValue]
 * @param {jail.Callback<T>} [onupdate]
 * @returns {jail.Node<T>}
 */
function createNode(initialValue, onupdate) {
  const localNode = {
    value: initialValue,
    parentNode: activeNode,
    childNodes: null,
    injections: null,
    cleanups: null,
    onupdate: onupdate || null,
    sources: null,
    sourceSlots: null,
  }
  if (activeNode !== null) {
    addChild.call(activeNode, localNode)
  }
  return localNode
}

/**
 * @this {jail.Node}
 * @param {jail.Node} node
 */
function addChild(node) {
  if (this.childNodes === null) {
    this.childNodes = [node]
  } else {
    this.childNodes.push(node)
  }
}

/**
 * @param {() => void} callback
 */
export function onMount(callback) {
  createEffect(() => untrack(callback))
}

/**
 * @param {() => void} callback
 */
export function onUnmount(callback) {
  onCleanup(() => untrack(callback))
}

/**
 * @template T
 * @param {() => void} dependency
 * @param {T & jail.Callback<T>} callback
 * @returns {T}
 */
export function on(dependency, callback) {
  return ((currentValue) => {
    dependency()
    return untrack(() => callback(currentValue))
  })
}

/**
 * @template T
 * @param {jail.Callback<T>} callback
 * @param {T} [initialValue]
 */
export function createEffect(callback, initialValue) {
  if (activeNode !== null) {
    const localNode = createNode(initialValue, callback)
    if (isRunning) {
      NodeQueue.add(localNode)
    } else {
      queueMicrotask(() => update.call(localNode, false))
    }
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

/**
 * @template T
 * @param {jail.Callback<T>} callback
 * @param {T} [initialValue]
 * @returns {() => T}
 */
export function createComputed(callback, initialValue) {
  const source = createSource(initialValue)
  createEffect(() => setValue.call(source, callback(source.value)))
  return getValue.bind(source)
}

/**
 * @this {jail.Node | null}
 * @param {string | symbol} key
 * @returns
 */
function lookup(key) {
  return this !== null
    ? this.injections !== null && key in this.injections
      ? this.injections[key]
      : lookup.call(this.parentNode, key)
    : undefined
}

/**
 * @template T
 * @param {T} [initialValue]
 * @returns {jail.Source<T>}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

/**
 * @template T
 * @this {jail.Source<T>}
 * @returns {T}
 */
function getValue() {
  if (activeNode !== null && activeNode.onupdate !== null) {
    const sourceSlot = this.nodes?.length || 0,
      nodeSlot = activeNode.sources?.length || 0
    if (activeNode.sources === null) {
      activeNode.sources = [this]
      activeNode.sourceSlots = [sourceSlot]
    } else {
      activeNode.sources.push(this)
      activeNode.sourceSlots.push(sourceSlot)
    }
    if (this.nodes === null) {
      this.nodes = [activeNode]
      this.nodeSlots = [nodeSlot]
    } else {
      this.nodes.push(activeNode)
      this.nodeSlots.push(nodeSlot)
    }
  }
  return this.value
}

/**
 * @template T
 * @this {jail.Source<T>}
 * @param {T | jail.Callback<T>} value
 */
function setValue(value) {
  if (typeof value === "function") {
    value = value(this.value)
  }
  this.value = value
  queueNodes.call(this)
}

/**
 * @param {any} data
 * @returns {boolean}
 */
export function isReactive(data) {
  if (data == null) {
    return false
  }
  if (typeof data === "function") {
    return true
  }
  if (typeof data === "object" && "value" in data) {
    return true
  }
  return false
}

/**
 * @template T
 * @param {jail.Signal<T> | jail.Ref<T> | T} data
 * @returns {T}
 */
export function toValue(data) {
  return typeof data === "function"
    ? data()
    : data && typeof data === "object" && "value" in data
    ? data.value
    : data
}

/**
 * @this {jail.Source}
 */
function queueNodes() {
  if (this.nodes?.length) {
    batch(() => {
      for (const node of this.nodes) {
        NodeQueue.add(node)
      }
    })
  }
}

/**
 * @template T
 * @this {jail.Source<T>}
 * @param {T | jail.Callback<T>} [value]
 * @returns {T | void}
 */
function sourceValue(value) {
  return arguments.length === 1
    ? setValue.call(this, value)
    : getValue.call(this)
}

/**
 * @template T
 * @param {T} [initialValue]
 * @returns {jail.Signal<T>}
 */
export function createSignal(initialValue) {
  return sourceValue.bind(createSource(initialValue))
}

/**
 * @template T
 * @param {T} [initialValue]
 * @returns {jail.Ref<T>}
 */
export function createRef(initialValue) {
  const source = createSource(initialValue)
  return {
    get value() {
      return getValue.call(source)
    },
    set value(nextValue) {
      setValue.call(source, nextValue)
    },
  }
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorCallbacks = lookup.call(activeNode, Error)
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
  if (activeNode === null) {
    return
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [Error]: [callback] }
  } else {
    activeNode.injections[Error].push(callback)
  }
}

/**
 * @param {jail.Cleanup} callback
 */
export function onCleanup(callback) {
  if (activeNode === null) {
    return
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [callback]
  } else {
    activeNode.cleanups.push(callback)
  }
}

/**
 * @template T
 * @param {() => T} callback
 * @returns {T}
 */
export function untrack(callback) {
  const localNode = activeNode
  activeNode = null
  const result = callback()
  activeNode = localNode
  return result
}

/**
 * @template T
 * @param {() => T} callback
 * @returns {T}
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
    update.call(node, false)
  }
  isRunning = false
}

/**
 * @template T
 * @this {jail.Node<T>}
 * @param {boolean} complete
 */
function update(complete) {
  clean.call(this, complete)
  if (this.onupdate === null) {
    return
  }
  const previousNode = activeNode
  activeNode = this
  try {
    this.value = this.onupdate(this.value)
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

/**
 * @template T
 * @this {jail.Node<T>}
 */
function cleanSources() {
  while (this.sources.length) {
    const source = this.sources.pop()
    const sourceSlot = this.sourceSlots.pop()
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
 * @template T
 * @this {jail.Node<T>}
 * @param {boolean} complete
 */
function cleanChildNodes(complete) {
  const hasUpdateHandler = this.onupdate !== null
  while (this.childNodes.length) {
    const childNode = this.childNodes.pop()
    clean.call(
      childNode,
      complete || (hasUpdateHandler && childNode.onupdate !== null),
    )
  }
}

/**
 * @template T
 * @this {jail.Node<T>}
 * @param {boolean} complete
 */
function clean(complete) {
  if (this.sources?.length) {
    cleanSources.call(this)
  }
  if (this.childNodes?.length) {
    cleanChildNodes.call(this, complete)
  }
  if (this.cleanups?.length) {
    cleanup.call(this)
  }
  this.injections = null
  if (complete) {
    dispose.call(this)
  }
}

/**
 * @template T
 * @this {jail.Node<T>}
 */
function cleanup() {
  while (this.cleanups.length) {
    this.cleanups.pop()()
  }
}

/**
 * @template T
 * @this {jail.Node<T>}
 */
function dispose() {
  this.value = null
  this.parentNode = null
  this.childNodes = null
  this.cleanups = null
  this.onupdate = null
  this.sources = null
  this.sourceSlots = null
}

/**
 * @param {string | symbol} key
 * @param {any} [defaultValue]
 */
export function inject(key, defaultValue) {
  return lookup.call(activeNode, key) || defaultValue
}

/**
 * @param {string | symbol} key
 * @param {any} value
 */
export function provide(key, value) {
  if (activeNode === null) {
    return
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [key]: value }
  } else {
    activeNode.injections[key] = value
  }
}

/**
 * @template T
 * @param {T & (...args: any[]) => any} callback
 * @returns {T}
 */
export function createCallback(callback) {
  const boundNode = activeNode
  return function Callback(...args) {
    return withNode(boundNode, () => callback(...args))
  }
}
