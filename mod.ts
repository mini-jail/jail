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
  context: { [id: symbol]: any } | undefined
  cleanups: Cleanup[] | undefined
  callback: ((current: T) => T) | undefined
  sources: Source[] | undefined
  sourceSlots: number[] | undefined
}
export type Ref<T = any> = {
  value: T
}
export type Context<T> = {
  readonly id: symbol
  readonly defaultValue: T | undefined
  provide<R>(value: T, callback: () => R): R
}

const Error = Symbol("Error")
const Queue = new Set<Node>()
let nodeQueue: Set<Node> | undefined
let parentNode: Node | undefined

export function scoped<T = any>(callback: (cleanup: Cleanup) => T): T | void {
  const _node = node<T>()
  parentNode = _node
  try {
    return batch(() => {
      let _cleanup: Cleanup | never = <never> undefined
      if (callback.length) {
        _cleanup = cleanNode.bind(undefined, _node, true)
      }
      return callback(_cleanup)
    })!
  } catch (error) {
    handleError(error)
  } finally {
    parentNode = _node.parentNode
  }
}

function node<T = any>(): Node<T | undefined>
function node<T = any>(initialValue: T): Node<T>
function node<T = any>(
  initialValue: T,
  callback: (current: T | undefined) => T,
): Node<T>
function node(
  initialValue?: any,
  callback?: (current: any | undefined) => any,
): Node<any | undefined> {
  const _node: Node = {
    value: initialValue,
    parentNode,
    children: undefined,
    context: undefined,
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

export function effect(callback: () => void): void
export function effect<T, N>(callback: (current: T | undefined) => N): void
export function effect<T, I>(callback: (current: I) => T, initialValue: I): void
export function effect(
  callback: (current: unknown) => unknown,
  initialValue?: unknown,
): void {
  if (parentNode) {
    const _node = node(initialValue, callback)
    if (nodeQueue) nodeQueue.add(_node)
    else queueMicrotask(() => updateNode(_node, false))
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

export function computed<T, N>(callback: (current: T | undefined) => N): () => N
export function computed<T, I>(
  callback: (current: I) => T,
  initialValue: I,
): () => T
export function computed(
  callback: (current: unknown) => unknown,
  initialValue?: unknown,
): (current: unknown) => unknown {
  const _source = source(initialValue)
  effect(() => set(_source, callback(_source.value!)))
  return get.bind(undefined, _source)
}

function lookup(node: Node | undefined, id: symbol): any | undefined {
  return node
    ? node.context && id in node.context
      ? node.context[id]
      : lookup(node.parentNode, id)
    : undefined
}

function source<T = any>(): Source<T | undefined>
function source<T = any>(initialValue: T): Source<T>
function source(initialValue?: any): Source<any | undefined> {
  return { value: initialValue, nodes: undefined, nodeSlots: undefined }
}

function get<T = any>(source: Source<T>): T {
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

function set<T = any>(source: Source<T>, value: any): void {
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

function getSet<T = any>(source: Source<T>, value?: any): T | void {
  return arguments.length === 1 ? get(source) : set(source, value)
}

export function signal<T>(): Signal<T | undefined>
export function signal<T>(initialValue: T): Signal<T>
export function signal(initialValue?: any): Signal<any | undefined> {
  const _source = source(initialValue)
  return getSet.bind(undefined, _source) as Signal<any | undefined>
}

export function ref<T>(): Ref<T | undefined>
export function ref<T>(initialValue: T): Ref<T>
export function ref(initialValue?: any): Ref<any | undefined> {
  const _source = source(initialValue)
  return {
    get value() {
      return get(_source)
    },
    set value(nextValue) {
      set(_source, nextValue)
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
  if (parentNode.context === undefined) {
    parentNode.context = { [Error]: [callback] }
  } else {
    parentNode.context[Error].push(callback)
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
  node.context = undefined
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

export function context<T>(): Context<T | undefined>
export function context<T>(defaultValue: T): Context<T>
export function context(defaultValue?: any): Context<any | undefined> {
  return {
    id: Symbol(),
    defaultValue,
    provide(value, callback) {
      return scoped(() => {
        parentNode!.context = { [this.id]: value }
        return callback()
      })!
    },
  }
}

export function provider<T>(callback: () => T): Context<T> {
  return scoped(() => context(callback()))!
}

export function inject<T>(context: Context<T>): T {
  return lookup(parentNode, context.id) || context.defaultValue
}
