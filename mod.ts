// todo: delete file

export type Cleanup = () => void;
export type Signal<T = any> = {
  (): T;
  (value: T | undefined): void;
  (callback: (current: T | undefined) => T): void;
};
export type Source<T = any> = {
  value: T | undefined | null;
  nodes: Node[] | null;
  nodeSlots: number[] | null;
};
export type Node<T = any> = {
  value: T | undefined | null;
  parentNode: Node | null;
  children: Node[] | null;
  injections: { [id: symbol]: any } | null;
  cleanups: Cleanup[] | null;
  callback: ((current: T) => T) | null;
  sources: Source[] | null;
  sourceSlots: number[] | null;
};
export type Ref<T = any> = {
  value: T;
};
export type Injection<T> = {
  readonly id: symbol;
  readonly defaultValue: T | undefined;
  provide<R>(value: T, callback: () => R): R;
};

const Error = Symbol();
const Queue = new Set<Node>();
let isRunning = false;
let activeNode: Node | null = null;

export function scoped<T = any>(callback: (cleanup: Cleanup) => T): T | void {
  activeNode = createNode<T>();
  try {
    return batch(() => {
      let _cleanup: Cleanup | never = <never> undefined;
      if (callback.length) {
        _cleanup = cleanNode.bind(undefined, activeNode!, true);
      }
      return callback(_cleanup);
    })!;
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = activeNode.parentNode;
  }
}

export function nodeRef(): Node | null {
  return activeNode;
}

export function withNode<T>(node: Node, callback: () => T): T {
  const previousNode = activeNode;
  activeNode = node;
  const result = callback();
  activeNode = previousNode;
  return result;
}

function createNode<T = any>(): Node<T | undefined>;
function createNode<T = any>(initialValue: T): Node<T>;
function createNode<T = any>(
  initialValue: T,
  callback: (current: T | undefined) => T,
): Node<T>;
function createNode(
  initialValue?: any,
  callback?: (current: any | undefined) => any,
): Node<any | undefined> {
  const node: Node = {
    value: initialValue,
    parentNode: activeNode,
    children: null,
    injections: null,
    cleanups: null,
    callback: callback || null,
    sources: null,
    sourceSlots: null,
  };
  if (activeNode) {
    if (activeNode.children === null) {
      activeNode.children = [node];
    } else {
      activeNode.children.push(node);
    }
  }
  return node;
}

export function onMount(callback: () => void): void {
  effect(() => untrack(callback));
}

export function onDestroy(callback: () => void): void {
  onCleanup(() => untrack(callback));
}

export function on<T>(
  dependency: () => void,
  callback: (current: T | undefined) => T,
): (current: T | undefined) => T {
  return ((current) => {
    dependency();
    return untrack(() => callback(current));
  });
}

export function effect<T>(callback: (current: T | undefined) => T): void;
export function effect<T, I>(
  callback: (current: I | T) => T,
  initialValue: I,
): void;
export function effect(
  callback: (current: unknown) => unknown,
  initialValue?: unknown,
): void {
  if (activeNode) {
    const node = createNode(initialValue, callback);
    if (isRunning) Queue.add(node);
    else queueMicrotask(() => updateNode(node, false));
  } else {
    queueMicrotask(() => callback(initialValue));
  }
}

export function computed<T>(callback: (current: T | undefined) => T): () => T;
export function computed<T, I>(
  callback: (current: I | T) => T,
  initialValue: I,
): () => T;
export function computed(
  callback: (current: unknown | undefined) => unknown,
  initialValue?: unknown,
): (current: unknown) => unknown {
  const source = createSource(initialValue);
  effect(() => setSourceValue(source, callback(source.value!)));
  return getSourceValue.bind(undefined, source);
}

function lookup(node: Node | null, id: symbol): any | undefined {
  return node
    ? node.injections && id in node.injections
      ? node.injections[id]
      : lookup(node.parentNode, id)
    : undefined;
}

function createSource<T = any>(): Source<T | undefined>;
function createSource<T = any>(initialValue: T): Source<T>;
function createSource(initialValue?: any): Source<any | undefined> {
  return { value: initialValue, nodes: null, nodeSlots: null };
}

function getSourceValue<T = any>(source: Source<T>): T {
  if (activeNode && activeNode.callback) {
    const sourceSlot = source.nodes?.length || 0,
      nodeSlot = activeNode.sources?.length || 0;
    if (activeNode.sources === null) {
      activeNode.sources = [source];
      activeNode.sourceSlots = [sourceSlot];
    } else {
      activeNode.sources.push(source);
      activeNode.sourceSlots!.push(sourceSlot);
    }
    if (source.nodes === null) {
      source.nodes = [activeNode];
      source.nodeSlots = [nodeSlot];
    } else {
      source.nodes!.push(activeNode);
      source.nodeSlots!.push(nodeSlot);
    }
  }
  return source.value!;
}

function setSourceValue<T = any>(source: Source<T>, value: any): void {
  if (typeof value === "function") value = value(source.value);
  source.value = value;
  if (source.nodes?.length) {
    batch(() => {
      for (const node of source.nodes!) {
        Queue.add(node);
      }
    });
  }
}

function sourceValue<T = any>(source: Source<T>, value?: any): T | void {
  return arguments.length === 1
    ? getSourceValue(source)
    : setSourceValue(source, value);
}

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initialValue: T): Signal<T>;
export function signal(initialValue?: any): Signal<any | undefined> {
  const source = createSource(initialValue);
  return sourceValue.bind(undefined, source) as Signal<any | undefined>;
}

export function ref<T>(): Ref<T | undefined>;
export function ref<T>(initialValue: T): Ref<T>;
export function ref(initialValue?: any): Ref<any | undefined> {
  const source = createSource(initialValue);
  return {
    get value() {
      return getSourceValue(source);
    },
    set value(nextValue) {
      setSourceValue(source, nextValue);
    },
  };
}

function handleError(error: any): void {
  const errorCallbacks: ((err: any) => void)[] = lookup(activeNode, Error);
  if (!errorCallbacks) return reportError(error);
  for (const callback of errorCallbacks) {
    callback(error);
  }
}

export function catchError<T = any>(callback: (error: T) => void): void {
  if (activeNode === null) return;
  if (activeNode.injections === null) {
    activeNode.injections = { [Error]: [callback] };
  } else {
    activeNode.injections[Error].push(callback);
  }
}

export function onCleanup(callback: () => void): void {
  if (activeNode === null) return;
  else if (!activeNode.cleanups) activeNode.cleanups = [callback];
  else activeNode.cleanups.push(callback);
}

export function untrack<T>(callback: () => T): T {
  const node = activeNode;
  activeNode = null;
  const result = callback();
  activeNode = node;
  return result;
}

function batch<T>(callback: () => T): T {
  if (isRunning) return callback();
  isRunning = true;
  const result = callback();
  queueMicrotask(flush);
  return result;
}

function flush(): void {
  if (isRunning === false) return;
  for (const node of Queue) {
    Queue.delete(node);
    updateNode(node, false);
  }
  isRunning = false;
}

function updateNode(node: Node, complete: boolean): void {
  cleanNode(node, complete);
  if (node.callback === null) return;
  const previousNode = activeNode;
  activeNode = node;
  try {
    node.value = node.callback(node.value);
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = previousNode;
  }
}

function cleanNodeSources(node: Node): void {
  let source: Source, sourceSlot: number, sourceNode: Node, nodeSlot: number;
  while (node.sources!.length) {
    source = node.sources!.pop()!;
    sourceSlot = node.sourceSlots!.pop()!;
    if (source.nodes?.length) {
      sourceNode = source.nodes.pop()!;
      nodeSlot = source.nodeSlots!.pop()!;
      if (sourceSlot < source.nodes.length) {
        source.nodes[sourceSlot] = sourceNode;
        source.nodeSlots![sourceSlot] = nodeSlot;
        sourceNode.sourceSlots![nodeSlot] = sourceSlot;
      }
    }
  }
}

function cleanChildNodes(node: Node, complete: boolean): void {
  const hasCallback = node.callback !== undefined;
  let childNode: Node;
  while (node.children!.length) {
    childNode = node.children!.pop()!;
    cleanNode(
      childNode,
      complete || (hasCallback && childNode.callback !== undefined),
    );
  }
}

function cleanNode(node: Node, complete: boolean): void {
  if (node.sources?.length) cleanNodeSources(node);
  if (node.children?.length) cleanChildNodes(node, complete);
  if (node.cleanups?.length) cleanup(node);
  node.injections = null;
  if (complete) disposeNode(node);
}

function cleanup(node: Node): void {
  while (node.cleanups?.length) {
    node.cleanups.pop()!();
  }
}

function disposeNode(node: Node): void {
  node.value = null;
  node.parentNode = null;
  node.children = null;
  node.cleanups = null;
  node.callback = null;
  node.sources = null;
  node.sourceSlots = null;
}

export function injection<T>(defaultValue?: T): Injection<T | undefined> {
  return {
    id: Symbol(),
    defaultValue,
    provide(value, callback) {
      return scoped(() => {
        activeNode!.injections = { [this.id]: value };
        return callback();
      })!;
    },
  };
}
