/**
 * #### Cleanup
 * A function that runs before a **Node** updates.
 *
 * Can be used to manually reset timer, intervals, etc.
 *
 * @typedef {() => void} Cleanup
 */

/**
 * #### Signal\<T\>
 * A function which:
 * * returns value `signal()`
 * * sets a new value `signal(value)`
 * * modifies current value `signal((currentValue) => nextValue)`
 *
 * @template [T = any]
 * @typedef {{
 *   () : T
 *   (value: T): void
 *   (callback: (currentValue: T | undefined) => T): void
 * }} Signal
 */

/**
 * #### Source\<T\>
 * An object which contains:
 * * a value
 * * an array of Nodes
 * * an array of Slots from the corresponding Nodes
 *
 * @template [T = any]
 * @typedef {{
 *   value: T | undefined | null
 *   nodes: Node[] | null
 *   nodeSlots: number[] | null
 * }} Source
 */

/**
 * #### Node\<T\>
 * A reactive object.
 *
 * If the Node will be triggered for an update, it will:
 * * remove all unused **Sources**
 * * run all **cleanup** functions
 * * run all **cleanup** function from its containing **child Nodes**
 * * run its **onupdate**
 * * update its **value**
 * * resets its **injections**
 *
 * @template [T = any]
 * @typedef {{
 *   value: T | undefined | null
 *   parentNode: Node | null
 *   childNodes: Node[] | null
 *   injections: { [id: symbol]: any } | null
 *   cleanups: Cleanup[] | null
 *   onupdate: ((currentValue: T | undefined) => T) | null
 *   sources: Source[] | null
 *   sourceSlots: number[] | null
 * }} Node
 */

/**
 * #### Node\<T\>
 * A object which contains the reactive property **value**.
 *
 * @template [T = any]
 * @typedef {{ value: T }} Ref
 */

/**
 * #### Injection\<T\>
 * An object containing a default value and a provider,
 * the provided value can be injected by calling **inject**.
 *
 * @template [T = any]
 * @typedef {{
 *   readonly id: symbol
 *   readonly defaultValue: T | undefined
 *   provide<R>(value: T, callback: (cleanup: Cleanup) => R): R | void
 * }} Injection
 */

const Error = Symbol();
/** @type {Set<Node>} */
const Queue = new Set();
let isRunning = false;
/** @type {Node | null} */
let activeNode = null;

/**
 * @template [T = any]
 * @param {(cleanup: Cleanup) => T | void} callback
 * @returns {T | void}
 * @example
 * ```js
 * createScope((cleanup) => {
 *   // do stuff
 *   // use cleanup() to stop all effects
 * });
 * ```
 */
export function createScope(callback) {
  const node = activeNode = createNode();
  try {
    return batch(() =>
      callback(
        callback.length === 0 ? undefined : clean.bind(node, true),
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
 * const [node, cleanup] = createScope((cleanup) => {
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
 * @template [T = any]
 * @param {Node} node
 * @param {() => T} callback
 * @example
 * ```js
 * // save node reference for later
 * const node = createScope(() => {
 *   // ...
 *   return nodeRef();
 * });
 *
 * // use node reference from before
 * withNode(node, () => {
 *   // do something inside that node
 * });
 * ```
 */
export function withNode(node, callback) {
  const previousNode = activeNode;
  activeNode = node;
  let result;
  try {
    result = callback();
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = previousNode;
  }
  return result;
}

/**
 * @template [T = any]
 * @param {T} [initialValue]
 * @param {(currentValue: T | undefined) => T} [onupdate]
 * @returns {Node<T>}
 */
function createNode(initialValue, onupdate) {
  /** @type {Node<T>} */
  const node = {
    value: initialValue,
    parentNode: activeNode,
    childNodes: null,
    injections: null,
    cleanups: null,
    onupdate: onupdate || null,
    sources: null,
    sourceSlots: null,
  };
  if (activeNode !== null) {
    addChild.call(activeNode, node);
  }
  return node;
}

/**
 * @this {Node}
 * @param {Node} node
 * @returns {void}
 */
function addChild(node) {
  if (this.childNodes === null) {
    this.childNodes = [node];
  } else {
    this.childNodes.push(node);
  }
}

/**
 * @param {() => void} callback
 * @returns {void}
 * @example
 * ```js
 * createScope(() => {
 *   onMount(() => {
 *     console.log("I will run in a queue");
 *   });
 *   console.log("I will run first");
 * });
 * ```
 */
export function onMount(callback) {
  createEffect(() => untrack(callback));
}

/**
 * @param {() => void} callback
 * @returns {void}
 * @example
 * ```js
 * createScope((cleanup) => {
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
 * @template [T = any]
 * @param {() => any} dependency
 * @param {(currentValue: T | undefined) => T} callback
 * @returns {(currentValue: T | undefined) => T}
 * @example
 * ```js
 * const sig1 = createSignal();
 * const sig2 = createSignal();
 *
 * createEffect(on(
 *   () => sig1(),
 *   () => console.log("I only re-run when sig1 is updated.")
 * ));
 * ```
 */
export function on(dependency, callback) {
  return ((currentValue) => {
    dependency();
    return untrack(() => callback(currentValue));
  });
}

/**
 * @template [T = any]
 * @param {(currentValue: T | undefined) => T} callback
 * @param {T} [initialValue]
 * @returns {void}
 * @example
 * ```js
 * const signal = createSignal();
 *
 * createEffect(() => {
 *   // will run when signal(s) are updated.
 *   console.log("current value", signal());
 * });
 * ```
 */
export function createEffect(callback, initialValue) {
  if (activeNode !== null) {
    const node = createNode(initialValue, callback);
    if (isRunning) {
      Queue.add(node);
    } else {
      queueMicrotask(() => update.call(node, false));
    }
  } else {
    queueMicrotask(() => callback(initialValue));
  }
}

/**
 * @template [T = any]
 * @param {(currentValue: T | undefined) => T} callback
 * @param {T} [initialValue]
 * @returns {() => T}
 * @example
 * ```js
 * const counter = createSignal(0);
 *
 * const double = createComputed(() => {
 *   // will run when signal(s) are updated.
 *   return counter() * 2;
 * });
 * ```
 */
export function createComputed(callback, initialValue) {
  const source = createSource(initialValue);
  createEffect(() => setValue.call(source, callback(source.value)));
  return getValue.bind(source);
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
 * @template [T = any]
 * @param {T} [initialValue]
 * @returns {Source<T>}
 */
function createSource(initialValue) {
  return { value: initialValue, nodes: null, nodeSlots: null };
}

/**
 * @template [T = any]
 * @this {Source<T>}
 * @returns {T | null | undefined}
 */
function getValue() {
  if (activeNode && activeNode.onupdate) {
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
 * @template [T = any]
 * @this {Source<T>}
 * @param {T | ((value: T) => T)} value
 * @returns {void}
 */
function setValue(value) {
  if (typeof value === "function") {
    value = value(this.value);
  }
  this.value = value;
  queueNodes.call(this);
}

/**
 * @template [T = any]
 * @this {Source<T>}
 * @returns {void}
 */
function queueNodes() {
  if (this.nodes?.length) {
    batch(() => {
      for (const node of this.nodes) {
        Queue.add(node);
      }
    });
  }
}

/**
 * @template [T = any]
 * @this {Source<T>}
 * @param {T | ((value: T) => T)} [value]
 * @returns {T | void}
 */
function sourceValue(value) {
  return arguments.length === 1
    ? setValue.call(this, value)
    : getValue.call(this);
}

/**
 * @template [T = any]
 * @param {T} [initialValue]
 * @returns {Signal<T>}
 * @example
 * ```js
 * const signal = createSignal("hello world");
 * signal(); // "hello world"
 *
 * signal("bye world");
 * signal(); // "bye world"
 *
 * signal((currentValue) => currentValue + "!");
 * signal(); //"bye world!"
 * ```
 */
export function createSignal(initialValue) {
  return sourceValue.bind(createSource(initialValue));
}

/**
 * @template [T = any]
 * @param {T} [initialValue]
 * @returns {Ref<T>}
 * @example
 * ```js
 * const ref = createRef("hello world");
 * ref.value; // "hello world"
 *
 * ref.value = "bye world";
 * ref.value; // "bye world"
 * ```
 */
export function createRef(initialValue) {
  const source = createSource(initialValue);
  return {
    get value() {
      return getValue.call(source);
    },
    set value(nextValue) {
      setValue.call(source, nextValue);
    },
  };
}

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
 * @template [T = any]
 * @param {(error: T) => void} callback
 * @returns {void}
 * @example
 * ```js
 * createScope(() => {
 *   catchError((err) => {
 *     console.info("There is an error, lol:", err);
 *   });
 *
 *   throw new Error("Take this, dirty scope1");
 * });
 * ```
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
 * @example
 * ```js
 * const id = setInterval(() => ..., 1000);
 *
 * createScope((cleanup) => {
 *   onCleanup(() => clearInterval(id));
 *   // ...
 *   cleanup(); // will also run callback from onCleanup
 * });
 * ```
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
 * @template [T = any]
 * @param {() => T} callback
 * @returns {T}
 * @example
 * ```js
 * const signal1 = createSignal();
 * const signal2 = createSignal();
 *
 * createEffect(() => {
 *   signal1();
 *   untrack(() => {
 *     signal2();
 *     // I will only run when signal1 is updated.
 *   });
 * });
 * ```
 */
export function untrack(callback) {
  const node = activeNode;
  activeNode = null;
  const result = callback();
  activeNode = node;
  return result;
}

/**
 * @template [T = any]
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
    update.call(node, false);
  }
  isRunning = false;
}

/**
 * @this {Node}
 * @param {boolean} complete
 * @returns {void}
 */
function update(complete) {
  clean.call(this, complete);
  if (this.onupdate === null) {
    return;
  }
  const previousNode = activeNode;
  activeNode = this;
  try {
    this.value = this.onupdate(this.value);
  } catch (error) {
    handleError(error);
  } finally {
    activeNode = previousNode;
  }
}

/**
 * @this {Node}
 */
function cleanSources() {
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
  const hasUpdateHandler = this.onupdate !== null;
  while (this.childNodes.length) {
    const childNode = this.childNodes.pop();
    clean.call(
      childNode,
      complete || (hasUpdateHandler && childNode.onupdate !== null),
    );
  }
}

/**
 * @this {Node}
 * @param {boolean} complete
 * @returns {void}
 */
function clean(complete) {
  if (this.sources?.length) {
    cleanSources.call(this);
  }
  if (this.childNodes?.length) {
    cleanChildNodes.call(this, complete);
  }
  if (this.cleanups?.length) {
    cleanup.call(this);
  }
  this.injections = null;
  if (complete) {
    dispose.call(this);
  }
}

/**
 * @this {Node}
 * @returns {void}
 */
function cleanup() {
  while (this.cleanups.length) {
    this.cleanups.pop()();
  }
}

/**
 * @this {Node}
 * @returns {void}
 */
function dispose() {
  this.value = null;
  this.parentNode = null;
  this.childNodes = null;
  this.cleanups = null;
  this.onupdate = null;
  this.sources = null;
  this.sourceSlots = null;
}

/**
 * @template [T = any]
 * @param {T} [defaultValue]
 * @returns {Injection<T>}
 * @example
 * ```js
 * const Theme = createInjection({
 *   color: "pink",
 * });
 *
 * Theme.provide({ color: "black" }, () => {
 *   const theme = inject(Theme); // { color: "black" }
 * });
 *
 * const theme = inject(Theme); // { color: "pink" }
 * ```
 */
export function createInjection(defaultValue) {
  return {
    id: Symbol(),
    defaultValue,
    provide(value, callback) {
      return createScope((cleanup) => {
        activeNode.injections = { [this.id]: value };
        return callback(cleanup);
      });
    },
  };
}

/**
 * @template [T = any]
 * @param {Injection<T>} injection
 * @returns {T | undefined}
 * @example
 * ```js
 * const Word = createInjection();
 *
 * Word.provide("hello", () => {
 *   inject(Word); // "hello"
 * });
 *
 * inject(Word); // undefined
 * ```
 */
export function inject(injection) {
  return lookup.call(activeNode, injection.id) || injection.defaultValue;
}
