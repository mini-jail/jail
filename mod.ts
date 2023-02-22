export type Cleanup = () => void
export type Callback<T = void> = T extends void ? (() => void)
  : ((value: T) => T)
export type Accessor<T = any> = () => T
export type Signal<T = any> = {
  (): T
  (value: T | undefined): void
  (callback: Callback<T>): void
}
export type Source<T = any> = {
  value?: T
  nodes?: Node[]
  nodeSlots?: number[]
}
export type Node<T = any> = {
  value?: T
  parentNode?: Node
  children?: Node[]
  context?: { [id: symbol]: any }
  cleanups?: Cleanup[]
  callback?: Callback<any>
  sources?: Source[]
  sourceSlots?: number[]
}
export type Ref<T = any> = {
  value: T
}
export type Context<T> = {
  readonly id: symbol
  readonly defaultValue: T | undefined
  provide<R>(value: T, callback: Accessor<R>): R
}

const Error = Symbol("Error")
const Queue = new Set<Node>()
let nodeQueue: Set<Node> | undefined
let parentNode: Node | undefined

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
    parentNode = _node.parentNode
  }
}

function node<T = any>(initialValue?: T, callback?: Callback<T>): Node<T> {
  const _node: Node<T> = {}
  if (initialValue) _node.value = initialValue
  if (callback) _node.callback = callback
  if (parentNode) {
    _node.parentNode = parentNode
    if (parentNode.children === undefined) {
      parentNode.children = [_node]
    } else {
      parentNode.children.push(_node)
    }
  }
  return _node
}

export function computed<T>(
  callback: Callback<T>,
  initialValue?: T,
): Accessor<T> {
  const _source = source(initialValue)
  effect(() => sourceValue(_source, callback(_source.value!)))
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
    const _node = node(initialValue, callback)
    if (nodeQueue) nodeQueue.add(_node)
    else queueMicrotask(() => updateNode(_node, false))
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

function lookup(node: Node | undefined, id: symbol): any | undefined {
  return node
    ? node.context && id in node.context
      ? node.context[id]
      : lookup(node.parentNode, id)
    : undefined
}

function source<T = any>(initialValue?: T): Source<T> {
  const _source: Source<T> = {}
  if (initialValue) _source.value = initialValue
  return _source
}

function sourceValue<T = any>(source: Source<T>): T
function sourceValue<T = any>(source: Source<T>, value: T): void
function sourceValue<T = any>(
  source: Source<T>,
  value: Callback<T>,
): void
function sourceValue<T = any>(source: Source<T>, next?: any) {
  if (arguments.length === 1) {
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
    return source.value
  }
  if (typeof next === "function") {
    next = next(source.value)
  }
  source.value = next
  if (source.nodes?.length) {
    batch(() => {
      for (const node of source.nodes!) {
        nodeQueue!.add(node)
      }
    })
  }
}

export function signal<T>(initialValue?: T): Signal<T> {
  const _source = source(initialValue)
  return sourceValue.bind(undefined, _source) as Signal<T>
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
  if (parentNode.context === undefined) {
    parentNode.context = { [Error]: [callback] }
  } else {
    parentNode.context[Error].push(callback)
  }
}

export function cleanup(callback: Callback): void {
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
  if (node.cleanups?.length) {
    while (node.cleanups.length) {
      node.cleanups.pop()!()
    }
  }
  node.context = undefined
  if (complete) {
    for (const property in node) {
      node[property as keyof Node] = undefined
      delete node[property as keyof Node]
    }
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
    parentNode!.context = { [context.id]: value }
    return callback()
  })!
}

export function use<T>(context: Context<T>): T {
  return lookup(parentNode, context.id) || context.defaultValue
}
