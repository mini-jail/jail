/// <reference types="./mod.d.ts" />
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
 * @param {(cleanup: jail.Cleanup) => unknown | void} callback
 * @returns {unknown | void}
 */
export function createRoot(callback) {
  const previousNode = activeNode, localNode = createNode()
  try {
    activeNode = localNode
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : clean.bind(localNode, true),
      )
    )
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

/**
 * @returns {jail.Node | null}
 */
export function nodeRef() {
  return activeNode
}

/**
 * @param {jail.Node} node
 * @param {() => unknown} callback
 * @returns {unknown}
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
 * @param {unknown} [initialValue]
 * @param {jail.Callback} [onupdate]
 * @returns {jail.Node}
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
 * @param {jail.Cleanup} callback
 */
export function onUnmount(callback) {
  onCleanup(() => untrack(callback))
}

/**
 * @param {() => void} dependency
 * @param {jail.Callback} callback
 * @returns {jail.Callback}
 */
export function on(dependency, callback) {
  return ((currentValue) => {
    dependency()
    return untrack(() => callback(currentValue))
  })
}

/**
 * @param {jail.Callback} callback
 * @param {unknown} [initialValue]
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
 * @param {jail.Callback} callback
 * @param {unknown} [initialValue]
 * @returns {jail.CallableSignal}
 */
export function createComputed(callback, initialValue) {
  const source = createSource(initialValue)
  createEffect(() => setValue.call(source, callback(source.value)))
  return getValue.bind(source)
}

/**
 * @this {jail.Node | null}
 * @param {keyof jail.Injections} key
 * @returns {jail.Injections[keyof jail.Injections] | undefined}
 */
function lookup(key) {
  return this !== null
    ? this.injections !== null && key in this.injections
      ? this.injections[key]
      : lookup.call(this.parentNode, key)
    : undefined
}

/**
 * @param {unknown} [initialValue]
 * @returns {jail.Source}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

/**
 * @this {jail.Source}
 * @returns {unknown}
 */
function getValue() {
  if (activeNode !== null && activeNode.onupdate != null) {
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
 * @this {jail.Source}
 * @param {unknown | jail.Callback} value
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
  return typeof data === "function"
}

/**
 * @param {jail.CallableSignal | unknown} data
 * @returns {unknown}
 */
export function toValue(data) {
  return typeof data === "function" ? data() : data
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
 * @this {jail.Source}
 * @param {unknown | jail.Callback} [value]
 * @returns {unknown | void}
 */
function sourceValue(value) {
  return arguments.length === 1
    ? setValue.call(this, value)
    : getValue.call(this)
}

/**
 * @param {unknown} [initialValue]
 * @returns {jail.Signal}
 */
export function createSignal(initialValue) {
  return sourceValue.bind(createSource(initialValue))
}

/**
 * @param {any} error
 */
function handleError(error) {
  const errorCallbacks = inject(Error)
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
 * @param {() => unknown} callback
 * @returns {unknown}
 */
export function untrack(callback) {
  const localNode = activeNode
  activeNode = null
  const result = callback()
  activeNode = localNode
  return result
}

/**
 * @param {() => unknown} callback
 * @returns {unknown}
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
 * @this {jail.Node}
 * @param {boolean} complete
 */
function update(complete) {
  clean.call(this, complete)
  if (this.onupdate == null) {
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
 * @this {jail.Node}
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
 * @this {jail.Node}
 * @param {boolean} complete
 */
function cleanChildNodes(complete) {
  const hasUpdateHandler = this.onupdate != null
  while (this.childNodes.length) {
    const childNode = this.childNodes.pop()
    clean.call(
      childNode,
      complete || (hasUpdateHandler && childNode.onupdate != null),
    )
  }
}

/**
 * @this {jail.Node}
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
 * @this {jail.Node}
 */
function cleanup() {
  while (this.cleanups.length) {
    this.cleanups.pop()()
  }
}

/**
 * @this {jail.Node}
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
 * @param {keyof jail.Injections} key
 * @param {jail.Injections[keyof jail.Injections}]} [defaultValue]
 * @returns {jail.Injections[keyof jail.Injections}] | undefined}
 */
export function inject(key, defaultValue) {
  return lookup.call(activeNode, key) || defaultValue
}

/**
 * @param {string | symbol} key
 * @param {any} value
 * @returns {unknown}
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
  return value
}

/**
 * @param {(...args: unknown[]) => unknown} callback
 * @returns {(...args: unknown[]) => unknown}
 */
export function createCallback(callback) {
  const boundNode = activeNode
  return function Callback(...args) {
    return withNode(boundNode, () => callback(...args))
  }
}
