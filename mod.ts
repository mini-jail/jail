const VALUE = 0
const NODE_PARENT = 1
const NODE_CHILDREN = 2
const NODE_CONTEXT = 3
const NODE_CLEANUPS = 4
const NODE_CALLBACK = 5
const NODE_SOURCES = 6
const NODE_SOURCESLOTS = 7
const SOURCE_NODES = 1
const SOURCE_NODESLOTS = 2
const Error = Symbol("Error")
const Queue = new Set<Node>()

let updateQueue: Set<Node> | undefined
let parentNode: Node | undefined

export type Cleanup = () => void
export type Callback<T = void> = T extends void ? (() => void)
  : ((value: T) => T)
export type Accessor<T = any> = () => T
export type SignalHandler<T = any> = {
  (): T
  (value: T | undefined): void
  (callback: Callback<T>): void
}
export type Source<T = any> = {
  [VALUE]?: T
  [SOURCE_NODES]?: Node[]
  [SOURCE_NODESLOTS]?: number[]
}
export type Node<T = any> = {
  [VALUE]?: T
  [NODE_PARENT]?: Node
  [NODE_CHILDREN]?: Node[]
  [NODE_CONTEXT]?: { [id: symbol]: any }
  [NODE_CLEANUPS]?: Cleanup[]
  [NODE_CALLBACK]?: Callback<any>
  [NODE_SOURCES]?: Source[]
  [NODE_SOURCESLOTS]?: number[]
}
export type Ref<T = any> = {
  value: T
}
export type Context<T> = {
  readonly id: symbol
  readonly defaultValue: T | undefined
  provide<R>(value: T, callback: Accessor<R>): R
}

export function root<T = any>(callback: (cleanup: Cleanup) => T): T | void {
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
    parentNode = _node[NODE_PARENT]
  }
}

function node<T = any>(initialValue?: T): Node<T> {
  const _node: Node<T> = [initialValue]
  if (parentNode) {
    _node[NODE_PARENT] = parentNode
    if (parentNode[NODE_CHILDREN] === undefined) {
      parentNode[NODE_CHILDREN] = [_node]
    } else {
      parentNode[NODE_CHILDREN].push(_node)
    }
  }
  return _node
}

function computation<T>(callback: Callback<T>, initialValue?: T): Node<T> {
  const _node = node<T>(initialValue)
  _node[NODE_CALLBACK] = callback
  return _node
}

export function computed<T>(
  callback: Callback<T>,
  initialValue?: T,
): Accessor<T> {
  const _source = source(initialValue)
  effect(() => sourceValue(_source, callback(_source[VALUE]!)))
  return () => sourceValue(_source)
}

export function mount(callback: Callback): void {
  effect(() => untrack(callback))
}

export function destroy(callback: Callback): void {
  cleanup(() => untrack(callback))
}

export function effect(callback: Callback): void
export function effect<T>(callback: Callback<T>): void
export function effect<T>(callback: Callback<T>, initialValue: T): void
export function effect(callback: Callback<any>, initialValue?: any): void {
  if (parentNode) {
    const _node = computation(callback, initialValue)
    if (updateQueue) updateQueue.add(_node)
    else queueMicrotask(() => updateNode(_node, false))
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

function lookup(node: Node | undefined, id: symbol): any | undefined {
  return node
    ? node[NODE_CONTEXT] && id in node[NODE_CONTEXT]
      ? node[NODE_CONTEXT][id]
      : lookup(node[NODE_PARENT], id)
    : undefined
}

function source<T = any>(initialValue?: T): Source<T> {
  return [initialValue]
}

function sourceValue<T = any>(source: Source<T>): T
function sourceValue<T = any>(source: Source<T>, value: T): void
function sourceValue<T = any>(
  source: Source<T>,
  value: Callback<T>,
): void
function sourceValue<T = any>(source: Source<T>, next?: any) {
  if (arguments.length === 1) {
    if (parentNode && parentNode[NODE_CALLBACK]) {
      const sourceSlot = source[SOURCE_NODES]?.length || 0,
        nodeSlot = parentNode[NODE_SOURCES]?.length || 0
      if (parentNode[NODE_SOURCES] === undefined) {
        parentNode[NODE_SOURCES] = [source]
        parentNode[NODE_SOURCESLOTS] = [sourceSlot]
      } else {
        parentNode[NODE_SOURCES].push(source)
        parentNode[NODE_SOURCESLOTS]!.push(sourceSlot)
      }
      if (source[SOURCE_NODES] === undefined) {
        source[SOURCE_NODES] = [parentNode]
        source[SOURCE_NODESLOTS] = [nodeSlot]
      } else {
        source[SOURCE_NODES]!.push(parentNode)
        source[SOURCE_NODESLOTS]!.push(nodeSlot)
      }
    }
    return source[VALUE]
  }
  if (typeof next === "function") {
    next = next(source[VALUE])
  }
  source[VALUE] = next
  if (source[SOURCE_NODES]?.length) {
    batch(() => {
      for (const node of source[SOURCE_NODES]!) {
        updateQueue!.add(node)
      }
    })
  }
}

export function signal<T>(initialValue?: T): SignalHandler<T> {
  const _source = source(initialValue)
  return sourceValue.bind(undefined, _source) as SignalHandler<T>
}

export function ref<T>(initialValue?: T): Ref<T> {
  const _source = source(initialValue)
  return {
    get value() {
      return sourceValue(_source)
    },
    set value(nextValue) {
      sourceValue(_source, nextValue)
    },
  }
}

function handleError(error: any): void {
  const errorCallbacks: Callback<any>[] = lookup(parentNode, Error)
  if (!errorCallbacks) return reportError(error)
  for (const callback of errorCallbacks) {
    callback(error)
  }
}

export function error<T = any>(callback: Callback<T>): void {
  if (parentNode === undefined) return
  if (!parentNode[NODE_CONTEXT]) {
    parentNode[NODE_CONTEXT] = { [Error]: [callback] }
  } else {
    parentNode[NODE_CONTEXT][Error].push(callback)
  }
}

export function cleanup(callback: Callback): void {
  if (parentNode === undefined) return
  else if (!parentNode[NODE_CLEANUPS]) parentNode[NODE_CLEANUPS] = [callback]
  else parentNode[NODE_CLEANUPS].push(callback)
}

export function untrack<T>(callback: () => T): T {
  const node = parentNode
  parentNode = undefined
  const result = callback()
  parentNode = node
  return result
}

function batch<T>(callback: () => T): T {
  if (updateQueue) return callback()
  updateQueue = Queue
  const result = callback()
  queueMicrotask(flush)
  return result
}

function flush(): void {
  if (updateQueue === undefined) return
  for (const node of updateQueue) {
    updateQueue.delete(node)
    updateNode(node, false)
  }
  updateQueue = undefined
}

function updateNode(node: Node, complete: boolean): void {
  cleanNode(node, complete)
  if (node[NODE_CALLBACK] === undefined) return
  const previousNode = parentNode
  parentNode = node
  try {
    node[VALUE] = node[NODE_CALLBACK](node[0])
  } catch (error) {
    handleError(error)
  } finally {
    parentNode = previousNode
  }
}

function cleanNodeSources(node: Node): void {
  let source: Source, sourceSlot: number, sourceNode: Node, nodeSlot: number
  while (node[NODE_SOURCES]!.length) {
    source = node[NODE_SOURCES]!.pop()!
    sourceSlot = node[NODE_SOURCESLOTS]!.pop()!
    if (source[SOURCE_NODES]?.length) {
      sourceNode = source[SOURCE_NODES].pop()!
      nodeSlot = source[SOURCE_NODESLOTS]!.pop()!
      if (sourceSlot < source[SOURCE_NODES].length) {
        source[SOURCE_NODES][sourceSlot] = sourceNode
        source[SOURCE_NODESLOTS]![sourceSlot] = nodeSlot
        sourceNode[NODE_SOURCESLOTS]![nodeSlot] = sourceSlot
      }
    }
  }
}

function cleanChildNodes(node: Node, complete: boolean): void {
  const hasCallback = node[NODE_CALLBACK] !== undefined
  let childNode: Node
  while (node[NODE_CHILDREN]!.length) {
    childNode = node[NODE_CHILDREN]!.pop()!
    cleanNode(
      childNode,
      complete || (hasCallback && childNode[NODE_CALLBACK] !== undefined),
    )
  }
}

function cleanNode(node: Node, complete: boolean): void {
  if (node[NODE_SOURCES]?.length) cleanNodeSources(node)
  if (node[NODE_CHILDREN]?.length) cleanChildNodes(node, complete)
  if (node[NODE_CLEANUPS]?.length) {
    while (node[NODE_CLEANUPS].length) {
      node[NODE_CLEANUPS].pop()!()
    }
  }
  delete node[NODE_CONTEXT]
  if (complete) {
    delete node[VALUE]
    delete node[NODE_CHILDREN]
    delete node[NODE_CLEANUPS]
    delete node[NODE_CALLBACK]
    delete node[NODE_PARENT]
    delete node[NODE_SOURCES]
    delete node[NODE_SOURCESLOTS]
  }
}

export function context<T>(defaultValue?: T): Context<T> {
  return {
    id: Symbol(),
    provide(value, callback) {
      return provide(this, value, callback)
    },
    defaultValue,
  }
}

export function provide<T, R>(
  context: Context<T>,
  value: T,
  callback: Accessor<R>,
): R {
  return root(() => {
    parentNode![NODE_CONTEXT] = { [context.id]: value }
    return callback()
  })!
}

export function use<T>(context: Context<T>): T {
  return lookup(parentNode, context.id) || context.defaultValue
}

context.use = use
