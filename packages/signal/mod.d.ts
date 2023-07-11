declare global {
  namespace jail {
    type Cleanup = () => void

    type Callback<T> = (currentValue: T | undefined) => T

    type SettableSignal<T = unknown> = (value: T) => void

    type UpdatableSignal<T = unknown> = (callback: Callback<T>) => void

    interface Signal<T = unknown>
      extends SettableSignal<T>, UpdatableSignal<T> {
      (): T
    }

    type Source<T = unknown> = {
      value: T | undefined | null
      nodes: Node[] | null
      nodeSlots: number[] | null
    }

    type Node<T = unknown> = {
      value: T | undefined | null
      parentNode: Node | null
      childNodes: Node[] | null
      injections: Injections | null
      cleanups: Cleanup[] | null
      onupdate: Callback<T> | null
      sources: Source[] | null
      sourceSlots: number[] | null
    }

    type Injections = ExtendableInjectionMap

    interface ExtendableInjectionMap {
      "jail/signal/error": ((error: any) => void)[]
    }
  }
}

/**
 * @example
 * ```js
 * createRoot((cleanup) => {
 *   // do stuff
 *   // use cleanup() to stop all effects etc.
 * });
 * ```
 */
export function createRoot<T>(
  callback: (cleanup: jail.Cleanup) => T | void,
): T | void

/**
 * @example
 * ```js
 * // save node reference for later
 * const [node, cleanup] = createRoot((cleanup) => {
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
export function nodeRef(): Node | null

/**
 * @example
 * ```js
 * // save node reference for later
 * const node = createRoot(() => {
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
export function withNode<T>(node: Node, callback: () => T): T

/**
 * @example
 * ```js
 * createRoot(() => {
 *   onMount(() => {
 *     console.log("I will run in a queue");
 *   });
 *   console.log("I will run first");
 * });
 * ```
 */
export function onMount(callback: () => void): void

/**
 * @example
 * ```js
 * createRoot((cleanup) => {
 *   onUnmount(() => {
 *     console.log("I will run when cleanup() is executed");
 *   });
 *   cleanup();
 * });
 * ```
 */
export function onUnmount(callback: jail.Cleanup): void

/**
 * @example
 * ```js
 * const sig1 = signal();
 * const sig2 = signal();
 *
 * createEffect(on(
 *   () => sig1(),
 *   () => console.log("I only re-run when sig1 is updated.")
 * ));
 * ```
 */
export function on<T>(
  dependency: () => void,
  callback: (currentValue: T | undefined) => T,
): (currentValue: T | undefined) => T

/**
 * @example
 * ```js
 * const sig = signal();
 *
 * createEffect(() => {
 *   // will run when signal(s) are updated.
 *   console.log("current value", sig());
 * });
 * ```
 */
export function createEffect(callback: () => void): void
export function createEffect<T>(
  callback: (currentValue: T | undefined) => T,
): void
export function createEffect<T>(
  callback: (currentValue: T) => T,
  initialValue: T,
): void

/**
 * @example
 * ```js
 * const counter = signal(0);
 *
 * const double = createComputed(() => {
 *   // will run when signal(s) are updated.
 *   return counter() * 2;
 * });
 * ```
 */
export function createComputed<T>(
  callback: (currentValue: T | undefined) => T,
): () => T
export function createComputed<T>(
  callback: (currentValue: T) => T,
  initialValue: T,
): () => T

export function isReactive<T>(data: unknown): data is () => T

export function toValue<T>(data: (() => T) | T): T

/**
 * @example
 * ```js
 * const sig = createSignal("hello world");
 * sig(); // "hello world"
 *
 * sig("bye world");
 * sig(); // "bye world"
 *
 * sig((currentValue) => currentValue + "!");
 * sig(); //"bye world!"
 * ```
 */
export function createSignal<T>(): jail.Signal<T | undefined>
export function createSignal<T>(initialValue: T): jail.Signal<T>

/**
 * @example
 * ```js
 * createRoot(() => {
 *   catchError((err) => {
 *     console.info("There is an error, lol:", err);
 *   });
 *
 *   throw new Error("Take this, dirty scope1");
 * });
 * ```
 */
export function catchError<T>(callback: (error: T) => void): void

/**
 * @example
 * ```js
 * const id = setInterval(() => ..., 1000);
 *
 * createRoot((cleanup) => {
 *   onCleanup(() => clearInterval(id));
 *   // ...
 *   cleanup(); // will also run callback from cleaned
 * });
 * ```
 */
export function onCleanup(callback: jail.Cleanup): void

/**
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
export function untrack<T>(callback: () => T): T

export function inject<K extends keyof jail.Injections>(
  key: K,
): jail.Injections[K] | undefined
export function inject<K extends keyof jail.Injections>(
  key: K,
  defaultValue: jail.Injections[K],
): jail.Injections[K]
export function inject<T>(key: string | symbol): T | undefined
export function inject<T>(key: string | symbol, defaultValue: T): T
export function inject(key: string | symbol): any | undefined
export function inject(key: string | symbol, defaultValue: any): any

export function provide<K extends keyof jail.Injections>(
  key: K,
  value: jail.Injections[K],
): void
export function provide<T>(key: string | symbol, value: T): void
export function provide(key: string | symbol, value: any): void

export function createCallback<T extends (...args: any[]) => any>(
  callback: T,
): T
