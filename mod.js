/**
 * @typedef {() => void} Cleanup
 */

/**
 * @template [T = unknown]
 * @typedef {{
 *   () : T
 *   (value: T): void
 *   (callback: (currentValue: T | undefined) => T): void
 * }} Signal<T>
 */

/**
 * @template [T = unknown]
 * @typedef {{
 *   value: T | undefined | null
 *   nodes: Node[] | null
 *   nodeSlots: number[] | null
 * }} Source<T>
 */

/**
 * @template [T = unknown]
 * @typedef {{
 *   value: T | undefined | null
 *   parentNode: Node | null
 *   children: Node[] | null
 *   injections: { [id: symbol]: any } | null
 *   cleanups: Cleanup[] | null
 *   callback: ((currentValue: T | undefined) => T) | null
 *   sources: Source[] | null
 *   sourceSlots: number[] | null
 * }} Node<T>
 */

/**
 * @template [T = unknown]
 * @typedef {{ value: T }} Ref<T>
 */

/**
 * @template [T = unknown]
 * @typedef {{
 *   readonly id: symbol
 *   readonly defaultValue: T | undefined
 *   provide<R>(value: T, callback: () => R): R
 * }} Injection<T>
 */

const Error = Symbol();
/** @type {Set<Node>} */
const Queue = new Set();
let isRunning = false;
/** @type {Node | null} */
let activeNode = null;

/**
 * @template [T = unknown]
 * @param {(cleanup: Cleanup) => T | void} callback
 * @returns {T | void}
 * @example
 * ```js
 * scoped((cleanup) => {
 *   // ...
 *   // use cleanup() to stop all effects
 * });
 * ```
 */
export function scoped(callback) {
  const node = activeNode = createNode();
  try {
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : cleanNode.bind(node, true),
      )
    );
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = node.parentNode;
  }
}

/**
 * @returns {Node | null}
 * @example
 * ```js
 * // save node reference for later
 * const [node, cleanup] = scoped((cleanup) => {
 *   // ...
 *   return [nodeRef(), cleanup];
 * });
 *
 * // use node reference from before
 * withNode(node, () => {
 *   // cleanup();
 * });
 * ```
 */
export function nodeRef() {
  return activeNode;
}

/**
 * @template [T = unknown]
 * @param {Node} node
 * @param {() => T} callback
 * @example
 * ```js
 * // save node reference for later
 * const [node, cleanup] = scoped((cleanup) => {
 *   // ...
 *   return [nodeRef(), cleanup];
 * });
 * // use node reference from before
 * withNode(node, () => {
 *   // cleanup();
 * });
 * ```
 */
export function withNode(node, callback) {
  const previousNode = activeNode;
  activeNode = node;
  const result = callback();
  activeNode = previousNode;
  return result;
}

/**
 * @template [T = unknown]
 * @param {T} [initialValue]
 * @param {(currentValue: T | undefined) => T} [callback]
 * @returns {Node<T>}
 */
function createNode(initialValue, callback) {
  /** @type {Node<T>} */
  const node = {
    value: initialValue,
    parentNode: activeNode,
    children: null,
    injections: null,
    cleanups: null,
    callback: callback || null,
    sources: null,
    sourceSlots: null,
  };
  if (activeNode !== null) {
    if (activeNode.children === null) {
      activeNode.children = [node];
    } else {
      activeNode.children.push(node);
    }
  }
  return node;
}

/**
 * @param {() => void} callback
 * @returns {void}
 * @example
 * ```js
 * scoped(() => {
 *   onMount(() => {
 *     console.log("I will run in Queue");
 *   });
 *   console.log("I will run first");
 * });
 * ```
 */
export function onMount(callback) {
  effect(() => untrack(callback));
}

/**
 * @param {() => void} callback
 * @returns {void}
 * @example
 * ```js
 * scoped((cleanup) => {
 *   onDestroy(() => {
 *     console.log("I will run when cleanup() is executed");
 *   });
 *   cleanup();
 * });
 * ```
 */
export function onDestroy(callback) {
  onCleanup(() => untrack(callback));
}

/**
 * @template [T = unknown]
 * @param {() => void} dependency
 * @param {(currentValue: T | undefined) => T} callback
 * @returns {(currentValue: T | undefined) => T}
 */
export function on(dependency, callback) {
  return ((currentValue) => {
    dependency();
    return untrack(() => callback(currentValue));
  });
}

/**
 * @template [T = unknown]
 * @param {(currentValue: T | undefined) => T} callback
 * @param {T} [initialValue]
 * @returns {void}
 */
export function effect(callback, initialValue) {
  if (activeNode !== null) {
    const node = createNode(initialValue, callback);
    if (isRunning) {
      Queue.add(node);
    } else {
      queueMicrotask(() => updateNode.call(node, false));
    }
  } else {
    queueMicrotask(() => callback(initialValue));
  }
}

/**
 * @template [T = unknown]
 * @param {(currentValue: T | undefined) => T} callback
 * @param {T} [initialValue]
 * @returns {() => T}
 */
export function computed(callback, initialValue) {
  const source = createSource(initialValue);
  effect(() => setSourceValue.call(source, callback(source.value)));
  return getSourceValue.bind(source);
}

/**
 * @this {Node | null}
 * @param {symbol} id
 * @returns {any | undefined}
 */
function lookup(id) {
  return this !== null
    ? this.injections !== null && id in this.injections
      ? this.injections[id]
      : lookup.call(this.parentNode, id)
    : undefined;
}

/**
 * @template [T = unknown]
 * @param {T} [initialValue]
 * @returns {Source<T>}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null };
}

/**
 * @template [T = unknown]
 * @this {Source<T>}
 * @returns {T | null | undefined}
 */
function getSourceValue() {
  if (activeNode && activeNode.callback) {
    const sourceSlot = this.nodes?.length || 0,
      nodeSlot = activeNode.sources?.length || 0;
    if (activeNode.sources === null) {
      activeNode.sources = [this];
      activeNode.sourceSlots = [sourceSlot];
    } else {
      activeNode.sources.push(this);
      activeNode.sourceSlots.push(sourceSlot);
    }
    if (this.nodes === null) {
      this.nodes = [activeNode];
      this.nodeSlots = [nodeSlot];
    } else {
      this.nodes.push(activeNode);
      this.nodeSlots.push(nodeSlot);
    }
  }
  return this.value;
}

/**
 * @template [T = unknown]
 * @this {Source<T>}
 * @param {T | ((value: T) => T)} value
 * @returns {void}
 */
function setSourceValue(value) {
  if (typeof value === "function") value = value(this.value);
  this.value = value;
  queueSourceNodes.call(this);
}

/**
 * @template [T = unknown]
 * @this {Source<T>}
 * @returns {void}
 */
function queueSourceNodes() {
  if (this.nodes?.length) {
    batch(() => {
      for (const node of this.nodes) {
        Queue.add(node);
      }
    });
  }
}

/**
 * @template [T = unknown]
 * @this {Source<T>}
 * @param {T | ((value: T) => T)} [value]
 * @returns {T | void}
 */
function sourceValue(value) {
  return arguments.length === 1
    ? setSourceValue.call(this, value)
    : getSourceValue.call(this);
}

/**
 * @template [T = unknown]
 * @param {T} [initialValue]
 * @returns {Signal<T>}
 */
export function signal(initialValue) {
  return sourceValue.bind(createSource(initialValue));
}

/**
 * @template [T = unknown]
 * @param {T} [initialValue]
 * @returns {Ref<T>}
 */
export function ref(initialValue) {
  const source = createSource(initialValue);
  return {
    get value() {
      return getSourceValue.call(source);
    },
    set value(nextValue) {
      setSourceValue.call(source, nextValue);
    },
  };
}

/**
 * @template [T = unknown]
 * @param {T & object} object
 * @returns {T}
 */
export function reactive(object) {
  return new Proxy(createSource(object), reactiveTrap);
}

/** @type {ProxyHandler<Source<T & object>>)} */
const reactiveTrap = {
  set(target, property, value) {
    const reflection = Reflect.set(target.value, property, value);
    queueSourceNodes.call(target);
    return reflection;
  },
  get(target, property) {
    return Reflect.get(getSourceValue.call(target), property);
  },
  has(target, property) {
    return Reflect.has(getSourceValue.call(target), property);
  },
};

/**
 * @param {any} error
 * @returns {void}
 */
function handleError(error) {
  /** @type {((err: any) => void)[]} */
  const errorCallbacks = lookup.call(activeNode, Error);
  if (!errorCallbacks) {
    return reportError(error);
  }
  for (const callback of errorCallbacks) {
    callback(error);
  }
}

/**
 * @template [T = unknown]
 * @param {(error: T) => void} callback
 * @returns {void}
 */
export function catchError(callback) {
  if (activeNode === null) {
    return;
  }
  if (activeNode.injections === null) {
    activeNode.injections = { [Error]: [callback] };
  } else {
    activeNode.injections[Error].push(callback);
  }
}

/**
 * @param {Cleanup} callback
 * @returns {void}
 */
export function onCleanup(callback) {
  if (activeNode === null) {
    return;
  }
  if (activeNode.cleanups === null) {
    activeNode.cleanups = [callback];
  } else {
    activeNode.cleanups.push(callback);
  }
}

/**
 * @template [T = unknown]
 * @param {() => T} callback
 * @returns {T}
 */
export function untrack(callback) {
  const node = activeNode;
  activeNode = null;
  const result = callback();
  activeNode = node;
  return result;
}

/**
 * @template [T = unknown]
 * @param {() => T} callback
 * @returns {T}
 */
function batch(callback) {
  if (isRunning) {
    return callback();
  }
  isRunning = true;
  const result = callback();
  queueMicrotask(flush);
  return result;
}

/**
 * @returns {void}
 */
function flush() {
  if (isRunning === false) {
    return;
  }
  for (const node of Queue) {
    Queue.delete(node);
    updateNode.call(node, false);
  }
  isRunning = false;
}

/**
 * @this {Node}
 * @param {boolean} complete
 * @returns {void}
 */
function updateNode(complete) {
  cleanNode.call(this, complete);
  if (this.callback === null) {
    return;
  }
  const previousNode = activeNode;
  activeNode = this;
  try {
    this.value = this.callback(this.value);
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = previousNode;
  }
}

/**
 * @this {Node}
 */
function cleanNodeSources() {
  while (this.sources.length) {
    const source = this.sources.pop();
    const sourceSlot = this.sourceSlots.pop();
    if (source.nodes?.length) {
      const sourceNode = source.nodes.pop();
      const nodeSlot = source.nodeSlots.pop();
      if (sourceSlot < source.nodes.length) {
        source.nodes[sourceSlot] = sourceNode;
        source.nodeSlots[sourceSlot] = nodeSlot;
        sourceNode.sourceSlots[nodeSlot] = sourceSlot;
      }
    }
  }
}

/**
 * @this {Node}
 * @param {boolean} complete
 * @returns {void}
 */
function cleanChildNodes(complete) {
  const hasCallback = !!this.callback;
  while (this.children.length) {
    const childNode = this.children.pop();
    cleanNode.call(
      childNode,
      complete || (hasCallback && !!childNode.callback),
    );
  }
}

/**
 * @this {Node}
 * @param {boolean} complete
 * @returns {void}
 */
function cleanNode(complete) {
  if (this.sources?.length) {
    cleanNodeSources.call(this);
  }
  if (this.children?.length) {
    cleanChildNodes.call(this, complete);
  }
  if (this.cleanups?.length) {
    cleanup.call(this);
  }
  this.injections = null;
  if (complete) {
    disposeNode.call(this);
  }
}

/**
 * @this {Node}
 * @returns {void}
 */
function cleanup() {
  while (this.cleanups?.length) {
    this.cleanups.pop()();
  }
}

/**
 * @this {Node}
 * @returns {void}
 */
function disposeNode() {
  this.value = null;
  this.parentNode = null;
  this.children = null;
  this.cleanups = null;
  this.callback = null;
  this.sources = null;
  this.sourceSlots = null;
}

/**
 * @template [T = unknown]
 * @param {T} [defaultValue]
 * @returns {Injection<T>}
 */
export function injection(defaultValue) {
  return {
    id: Symbol(),
    defaultValue,
    provide(value, callback) {
      return scoped(() => {
        activeNode.injections = { [this.id]: value };
        return callback();
      });
    },
  };
}

/**
 * @template [T = unknown]
 * @param {Injection<T>} injection
 * @returns {T | undefined}
 */
export function inject(injection) {
  return lookup.call(activeNode, injection.id) || injection.defaultValue;
}
