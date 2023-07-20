const Error = Symbol("Error")
const NodeQueue: Set<Node> = new Set()
let isRunning = false
let activeNode: Node | null = null

export function createRoot<T>(
  callback: (cleanup: Cleanup) => T | void,
): T | void {
  const previousNode = activeNode, localNode = createNode()
  try {
    activeNode = localNode
    return batch(() =>
      callback(
        <any> (callback.length === 0 ? undefined : clean.bind(localNode, true)),
      )
    )
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = previousNode
  }
}

export function nodeRef(): Node | null {
  return activeNode
}

export function withNode<T>(node: Node, callback: () => T): T | void {
  const localNode = activeNode
  activeNode = node
  let result: T | undefined
  try {
    result = callback()
  } catch (error) {
    handleError(error)
  } finally {
    activeNode = localNode
  }
  return result
}

function createNode<T = any>(
  initialValue?: T,
  onupdate?: Callback<T>,
): Node<T> {
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
    if (activeNode.childNodes === null) {
      activeNode.childNodes = [localNode]
    } else {
      activeNode.childNodes.push(localNode)
    }
  }
  return localNode
}

export function onMount(callback: () => void): void {
  createEffect(() => untrack(callback))
}

export function onUnmount(cleanup: Cleanup) {
  onCleanup(() => untrack(cleanup))
}

export function on<T>(
  dependency: () => any,
  callback: Callback<T>,
): Callback<T> {
  return ((currentValue) => {
    dependency()
    return untrack(() => callback(currentValue))
  })
}

export function createEffect<T>(callback: Callback<T | undefined>): void
export function createEffect<T>(callback: Callback<T>, initialValue: T): void
export function createEffect<T>(callback: Callback<T>, initialValue?: T) {
  if (activeNode !== null) {
    const localNode = createNode(initialValue, callback)
    if (isRunning) {
      NodeQueue.add(localNode)
    } else {
      queueMicrotask(() => update(localNode, false))
    }
  } else {
    queueMicrotask(() => callback(initialValue))
  }
}

export function createComputed<T>(
  callback: Callback<T | undefined>,
): () => T | undefined
export function createComputed<T>(
  callback: Callback<T>,
  initialValue: T,
): () => T
export function createComputed(
  callback: Callback<any>,
  initialValue?: any,
): () => any | undefined {
  const source = createSource(initialValue)
  createEffect(() => setValue.call(source, callback(source.value)))
  return getValue.bind(source)
}

function lookup(node: Node | null, key: string | symbol): any | undefined {
  return node !== null
    ? node.injections !== null && key in node.injections
      ? node.injections[key]
      : lookup(node.parentNode, key)
    : undefined
}

function createSource<T>(initialValue?: T): Source<T> {
  return { value: initialValue, nodes: null, nodeSlots: null }
}

function getValue<T>(this: Source<T>): T | undefined {
  if (activeNode !== null && activeNode.onupdate != null) {
    const sourceSlot = this.nodes?.length || 0,
      nodeSlot = activeNode.sources?.length || 0
    if (activeNode.sources === null) {
      activeNode.sources = [this]
      activeNode.sourceSlots = [sourceSlot]
    } else {
      activeNode.sources.push(this)
      activeNode.sourceSlots!.push(sourceSlot)
    }
    if (this.nodes === null) {
      this.nodes = [activeNode]
      this.nodeSlots = [nodeSlot]
    } else {
      this.nodes.push(activeNode)
      this.nodeSlots!.push(nodeSlot)
    }
  }
  return this.value
}

function setValue<T>(this: Source<T>, value: T | Callback<T>): void {
  if (typeof value === "function") {
    value = (<Callback<T>> value)(this.value)
  }
  this.value = value
  queueNodes(this)
}

export function isReactive(data: any): boolean {
  return typeof data === "function"
}

export function toValue<T>(data: T | (() => T)): T {
  return typeof data === "function" ? (<() => T> data)() : data
}

function queueNodes<T>(source: Source<T>): void {
  if (source.nodes?.length) {
    batch(() => {
      for (const node of source.nodes!) {
        NodeQueue.add(node)
      }
    })
  }
}

function sourceValue<T>(this: Source<T>): T
function sourceValue<T>(this: Source<T>, value: T | Callback<T>): void
function sourceValue(this: Source, value?: any): any | void {
  return arguments.length === 1
    ? setValue.call(this, value)
    : getValue.call(this)
}

export function createSignal<T>(initialValue?: T): Signal<T> {
  return sourceValue.bind(createSource(initialValue)) as Signal<T>
}

function handleError(error: any): void {
  const errorCallbacks = inject(Error)
  if (!errorCallbacks) {
    return reportError(error)
  }
  for (const callback of errorCallbacks) {
    callback(error)
  }
}

export function catchError<T>(callback: (error: T) => void): void {
  if (activeNode === null) {
    return
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [Error]: [callback] }
  } else {
    activeNode.injections[Error]!.push(callback)
  }
}

export function onCleanup(cleanup: Cleanup): void {
  if (activeNode === null) {
    return
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [cleanup]
  } else {
    activeNode.cleanups.push(cleanup)
  }
}

export function untrack<T>(callback: () => T): T {
  const localNode = activeNode
  activeNode = null
  const result = callback()
  activeNode = localNode
  return result
}

function batch<T>(callback: () => T): T {
  if (isRunning) {
    return callback()
  }
  isRunning = true
  const result = callback()
  queueMicrotask(flush)
  return result
}

function flush(): void {
  if (isRunning === false) {
    return
  }
  for (const node of NodeQueue) {
    NodeQueue.delete(node)
    update(node, false)
  }
  isRunning = false
}

function update(node: Node, complete?: boolean) {
  clean.call(node, complete)
  if (node.onupdate == null) {
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

function cleanSources(node: Node): void {
  while (node.sources!.length) {
    const source = node.sources!.pop()!
    const sourceSlot = node.sourceSlots!.pop()!
    if (source!.nodes?.length) {
      const sourceNode = source!.nodes.pop()!
      const nodeSlot = source.nodeSlots!.pop()!
      if (sourceSlot < source.nodes.length) {
        source.nodes[sourceSlot] = sourceNode
        source.nodeSlots![sourceSlot] = nodeSlot
        sourceNode.sourceSlots![nodeSlot] = sourceSlot
      }
    }
  }
}

function cleanChildNodes(node: Node, complete?: boolean): void {
  const hasUpdateHandler = node.onupdate != null
  while (node.childNodes!.length) {
    const childNode = node.childNodes!.pop()!
    clean.call(
      childNode,
      complete || (hasUpdateHandler && childNode.onupdate != null),
    )
  }
}

function clean(this: Node, complete?: boolean): void {
  if (this.sources?.length) {
    cleanSources(this)
  }
  if (this.childNodes?.length) {
    cleanChildNodes(this, complete)
  }
  if (this.cleanups?.length) {
    cleanup(this)
  }
  this.injections = null
  if (complete) {
    dispose(this)
  }
}

function cleanup(node: Node): void {
  while (node.cleanups!.length) {
    node.cleanups!.pop()!()
  }
}

function dispose(node: Node): void {
  node.value = null
  node.parentNode = null
  node.childNodes = null
  node.cleanups = null
  node.onupdate = null
  node.sources = null
  node.sourceSlots = null
}

export function inject<K extends keyof jail.Injections>(
  key: K,
): jail.Injections[K] | undefined
export function inject<K extends keyof jail.Injections>(
  key: K,
  defaultValue: jail.Injections[K],
): jail.Injections[K]
export function inject<T>(
  key: string | symbol,
): T | undefined
export function inject<T>(
  key: string | symbol,
  defaultValue: T,
): T
export function inject(
  key: string | symbol,
  defaultValue?: any,
): any | undefined {
  return lookup(activeNode, key) || defaultValue
}

export function provide<K extends keyof jail.Injections>(
  key: K,
  value: jail.Injections[K],
): void
export function provide<T>(key: string | symbol, value: T): void
export function provide(
  key: keyof jail.Injections | string | symbol,
  value: any,
): void {
  if (activeNode === null) {
    return
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [key]: value }
  } else {
    activeNode.injections[key] = value
  }
}

export function createCallback<T extends (...args: any[]) => any>(
  callback: T,
): T {
  const boundNode = activeNode
  return function Callback(...args) {
    return withNode(boundNode!, () => callback(...args))
  } as T
}

declare global {
  namespace jail {
    interface Injections {
      [Error]?: ((error: any) => void)[]
    }
  }
}

export type Callback<T> = (currentValue: T | undefined) => T

export type Cleanup = () => void

export type SettableSignal<T = any> = (value: T) => void

export type UpdatableSignal<T = any> = (callback: Callback<T>) => void

export interface Signal<T = any> extends SettableSignal<T>, UpdatableSignal<T> {
  (): T
}

export type Source<T = any> = {
  value: T | undefined
  nodes: Node[] | null
  nodeSlots: number[] | null
}

export type Node<T = any> = {
  value: T | undefined | null
  parentNode: Node | null
  childNodes: Node[] | null
  injections: jail.Injections | null
  cleanups: Cleanup[] | null
  onupdate: Callback<T> | null
  sources: Source[] | null
  sourceSlots: number[] | null
}
