export type Cleanup = () => void
export type Signal<T = any> = {
  (): T
  (value: T | undefined): void
  (callback: (current: T | undefined) => T): void
}
export type Source<T = any> = {
  value: T | undefined | null
  nodes: Node[] | undefined
  nodeSlots: number[] | undefined
}
export type Node<T = any> = {
  value: T | undefined | null
  parentNode: Node | undefined
  children: Node[] | undefined
  injections: { [id: symbol]: any } | undefined
  cleanups: Cleanup[] | undefined
  callback: ((current: T) => T) | undefined
  sources: Source[] | undefined
  sourceSlots: number[] | undefined
}
export type Ref<T = any> = {
  value: T
}
export type Provider<T> = <R>(value: T, callback: () => R) => R
export type Injection<T> = {
  readonly id: symbol
  readonly defaultValue: T | undefined
}

const Error = Symbol()
const Queue = new Set<Node>()
let nodeQueue: Set<Node> | undefined
let parentNode: Node | undefined

export function scoped<T = any>(callback: (cleanup: Cleanup) => T): T | void {
  const node = createNode<T>()
  parentNode = node
  try {
    return batch(() => {
      let _cleanup: Cleanup | never = <never> undefined
      if (callback.length) {
        _cleanup = cleanNode.bind(undefined, node, true)
      }
      return callback(_cleanup)
    })!
  } catch (error) {
    handleError(error)
  } finally {
    parentNode = node.parentNode
  }
}

export function nodeRef(): Node | undefined {
  return parentNode
}

function createNode<T = any>(): Node<T | undefined>
function createNode<T = any>(initialValue: T): Node<T>
function createNode<T = any>(
  initialValue: T,
  callback: (current: T | undefined) => T,
): Node<T>
function createNode(
  initialValue?: any,
  callback?: (current: any | undefined) => any,
): Node<any | undefined> {
  const _node: Node = {
    value: initialValue,
    parentNode,
    children: undefined,
    injections: undefined,
    cleanups: undefined,
    callback,
    sources: undefined,
    sourceSlots: undefined,
  }
  if (parentNode) {
    if (parentNode.children === undefined) {
      parentNode.children = [_node]
    } else {
      parentNode.children.push(_node)
    }
  }
  return _node
}

export function onMount(callback: () => void): void {
  effect(() => untrack(callback))
}

export function onDestroy(callback: () => void): void {
  onCleanup(() => untrack(callback))
}

export function on<T>(
  dependency: () => unknown,
  callback: (current: T | undefined) => T,
): (current: T | undefined) => T {
  return ((current) => {
    dependency()
    return untrack(() => callback(current))
  })
}

export function effect<T>(callback: (current: T | undefined) => T): void
export function effect<T, I>(
  callback: (current: I | T) => T,
  initialValue: I,
): void
export function effect(
  callback: (current: unknown) => unknown,
  initialValue?: unknown,
): void {
  if (parentNode) {
    const node = createNode(initialValue, callback)
    if (nodeQueue) nodeQueue.add(node)
    else queueMicrotask(() => updateNode(node, false))
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

export function computed<T>(callback: (current: T | undefined) => T): () => T
export function computed<T, I>(
  callback: (current: I | T) => T,
  initialValue: I,
): () => T
export function computed(
  callback: (current: unknown | undefined) => unknown,
  initialValue?: unknown,
): (current: unknown) => unknown {
  const source = createSource(initialValue)
  effect(() => setSourceValue(source, callback(source.value!)))
  return getSourceValue.bind(undefined, source)
}

function lookup(node: Node | undefined, id: symbol): any | undefined {
  return node
    ? node.injections && id in node.injections
      ? node.injections[id]
      : lookup(node.parentNode, id)
    : undefined
}

function createSource<T = any>(): Source<T | undefined>
function createSource<T = any>(initialValue: T): Source<T>
function createSource(initialValue?: any): Source<any | undefined> {
  return { value: initialValue, nodes: undefined, nodeSlots: undefined }
}

function getSourceValue<T = any>(source: Source<T>): T {
  if (parentNode && parentNode.callback) {
    const sourceSlot = source.nodes?.length || 0,
      nodeSlot = parentNode.sources?.length || 0
    if (parentNode.sources === undefined) {
      parentNode.sources = [source]
      parentNode.sourceSlots = [sourceSlot]
    } else {
      parentNode.sources.push(source)
      parentNode.sourceSlots!.push(sourceSlot)
    }
    if (source.nodes === undefined) {
      source.nodes = [parentNode]
      source.nodeSlots = [nodeSlot]
    } else {
      source.nodes!.push(parentNode)
      source.nodeSlots!.push(nodeSlot)
    }
  }
  return source.value!
}

function setSourceValue<T = any>(source: Source<T>, value: any): void {
  if (typeof value === "function") value = value(source.value)
  source.value = value
  if (source.nodes?.length) {
    batch(() => {
      for (const node of source.nodes!) {
        nodeQueue!.add(node)
      }
    })
  }
}

function sourceValue<T = any>(source: Source<T>, value?: any): T | void {
  return arguments.length === 1
    ? getSourceValue(source)
    : setSourceValue(source, value)
}

export function signal<T>(): Signal<T | undefined>
export function signal<T>(initialValue: T): Signal<T>
export function signal(initialValue?: any): Signal<any | undefined> {
  const source = createSource(initialValue)
  return sourceValue.bind(undefined, source) as Signal<any | undefined>
}

export function ref<T>(): Ref<T | undefined>
export function ref<T>(initialValue: T): Ref<T>
export function ref(initialValue?: any): Ref<any | undefined> {
  const source = createSource(initialValue)
  return {
    get value() {
      return getSourceValue(source)
    },
    set value(nextValue) {
      setSourceValue(source, nextValue)
    },
  }
}

function handleError(error: any): void {
  const errorCallbacks: ((err: any) => void)[] = lookup(parentNode, Error)
  if (!errorCallbacks) return reportError(error)
  for (const callback of errorCallbacks) {
    callback(error)
  }
}

export function onError<T = any>(callback: (error: T) => void): void {
  if (parentNode === undefined) return
  if (parentNode.injections === undefined) {
    parentNode.injections = { [Error]: [callback] }
  } else {
    parentNode.injections[Error].push(callback)
  }
}

export function onCleanup(callback: () => void): void {
  if (parentNode === undefined) return
  else if (!parentNode.cleanups) parentNode.cleanups = [callback]
  else parentNode.cleanups.push(callback)
}

export function untrack<T>(callback: () => T): T {
  const node = parentNode
  parentNode = undefined
  const result = callback()
  parentNode = node
  return result
}

function batch<T>(callback: () => T): T {
  if (nodeQueue) return callback()
  nodeQueue = Queue
  const result = callback()
  queueMicrotask(flush)
  return result
}

function flush(): void {
  if (nodeQueue === undefined) return
  for (const node of nodeQueue) {
    nodeQueue.delete(node)
    updateNode(node, false)
  }
  nodeQueue = undefined
}

function updateNode(node: Node, complete: boolean): void {
  cleanNode(node, complete)
  if (node.callback === undefined) return
  const previousNode = parentNode
  parentNode = node
  try {
    node.value = node.callback(node.value)
  } catch (error) {
    handleError(error)
  } finally {
    parentNode = previousNode
  }
}

function cleanNodeSources(node: Node): void {
  let source: Source, sourceSlot: number, sourceNode: Node, nodeSlot: number
  while (node.sources!.length) {
    source = node.sources!.pop()!
    sourceSlot = node.sourceSlots!.pop()!
    if (source.nodes?.length) {
      sourceNode = source.nodes.pop()!
      nodeSlot = source.nodeSlots!.pop()!
      if (sourceSlot < source.nodes.length) {
        source.nodes[sourceSlot] = sourceNode
        source.nodeSlots![sourceSlot] = nodeSlot
        sourceNode.sourceSlots![nodeSlot] = sourceSlot
      }
    }
  }
}

function cleanChildNodes(node: Node, complete: boolean): void {
  const hasCallback = node.callback !== undefined
  let childNode: Node
  while (node.children!.length) {
    childNode = node.children!.pop()!
    cleanNode(
      childNode,
      complete || (hasCallback && childNode.callback !== undefined),
    )
  }
}

function cleanNode(node: Node, complete: boolean): void {
  if (node.sources?.length) cleanNodeSources(node)
  if (node.children?.length) cleanChildNodes(node, complete)
  if (node.cleanups?.length) cleanup(node)
  node.injections = undefined
  if (complete) disposeNode(node)
}

function cleanup(node: Node): void {
  while (node.cleanups?.length) {
    node.cleanups.pop()!()
  }
}

function disposeNode(node: Node): void {
  node.value = undefined
  node.parentNode = undefined
  node.children = undefined
  node.cleanups = undefined
  node.callback = undefined
  node.sources = undefined
  node.sourceSlots = undefined
}

export function injection<T>(): Injection<T | undefined>
export function injection<T>(defaultValue: T): Injection<T>
export function injection(defaultValue?: any): Injection<any | undefined> {
  return { id: Symbol(), defaultValue }
}

export function provide<T, R>(
  injection: Injection<T>,
  value: T,
  callback: () => R,
): R {
  return scoped(() => {
    parentNode!.injections = { [injection.id]: value }
    return callback()
  })!
}

export function provider<T>(injection: Injection<T>): Provider<T> {
  return (value, callback) => provide(injection, value, callback)
}

export function inject<T>(injection: Injection<T>): T {
  return lookup(parentNode, injection.id) || injection.defaultValue
}
