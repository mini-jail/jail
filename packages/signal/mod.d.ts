declare global {
  type Cleanup = {
    (): void;
  };

  type Signal<T = unknown> = {
    (): T;
    (value: T): void;
    (update: (currentValue: T | undefined) => T): void;
  };

  type Source<T = unknown> = {
    value: T | undefined | null;
    branches: Branch[] | null;
    branchSlots: number[] | null;
  };

  type Branch<T = unknown> = {
    value: T | undefined | null;
    parentBranch: Branch | null;
    childBranches: Branch[] | null;
    injections: { [id: symbol]: unknown } | null;
    cleanups: Cleanup[] | null;
    onupdate: ((currentValue: T | undefined) => T) | null;
    sources: Source[] | null;
    sourceSlots: number[] | null;
  };

  type Ref<T = unknown> = {
    value: T;
  };

  type Injection<T = unknown> = {
    readonly id: symbol;
    readonly defaultValue: T | undefined;
    provide<R>(value: T, callback: (cleanup: Cleanup) => R): R | void;
  };
}

/**
 * @example
 * ```js
 * tree((cleanup) => {
 *   // do stuff
 *   // use cleanup() to stop all effects
 * });
 * ```
 */
export function tree<T>(callback: (cleanup: Cleanup) => T | void): T | void;

/**
 * @example
 * ```js
 * // save branch reference for later
 * const [branch, cleanup] = tree((cleanup) => {
 *   // ...
 *   return [branchRef(), cleanup];
 * });
 *
 * // use branch reference from before
 * withBranch(branch, () => {
 *   // cleanup();
 * });
 * ```
 */
export function branchRef(): Branch | null;

/**
 * @example
 * ```js
 * // save branch reference for later
 * const branch = tree(() => {
 *   // ...
 *   return branchRef();
 * });
 *
 * // use branch reference from before
 * withBranch(branch, () => {
 *   // do something inside that branch
 * });
 * ```
 */
export function withBranch<T>(branch: Branch, callback: () => T): T;

/**
 * @example
 * ```js
 * tree(() => {
 *   mounted(() => {
 *     console.log("I will run in a queue");
 *   });
 *   console.log("I will run first");
 * });
 * ```
 */
export function mounted(callback: () => void): void;

/**
 * @example
 * ```js
 * tree((cleanup) => {
 *   destroyed(() => {
 *     console.log("I will run when cleanup() is executed");
 *   });
 *   cleanup();
 * });
 * ```
 */
export function destroyed(callback: () => void): void;

/**
 * @example
 * ```js
 * const sig1 = signal();
 * const sig2 = signal();
 *
 * effect(on(
 *   () => sig1(),
 *   () => console.log("I only re-run when sig1 is updated.")
 * ));
 * ```
 */
export function on<T>(
  dependency: () => void,
  callback: (currentValue: T | undefined) => T,
): (currentValue: T | undefined) => T;

/**
 * @example
 * ```js
 * const sig = signal();
 *
 * effect(() => {
 *   // will run when signal(s) are updated.
 *   console.log("current value", sig());
 * });
 * ```
 */
export function effect<T>(
  callback: (currentValue: T | undefined) => T,
): void;
export function effect<T>(
  callback: (currentValue: T) => T,
  initialValue: T,
): void;

/**
 * @example
 * ```js
 * const counter = signal(0);
 *
 * const double = computed(() => {
 *   // will run when signal(s) are updated.
 *   return counter() * 2;
 * });
 * ```
 */
export function computed<T>(
  callback: (currentValue: T | undefined) => T,
): () => T;
export function computed<T>(
  callback: (currentValue: T) => T,
  initialValue: T,
): () => T;

export function isReactive<T>(
  data: unknown,
): data is Ref<T> | Signal<T>;

export function toValue<T>(data: Ref<T> | Signal<T> | T): T;

/**
 * @example
 * ```js
 * const sig = signal("hello world");
 * sig(); // "hello world"
 *
 * sig("bye world");
 * sig(); // "bye world"
 *
 * sig((currentValue) => currentValue + "!");
 * sig(); //"bye world!"
 * ```
 */
export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initialValue: T): Signal<T>;

/**
 * @example
 * ```js
 * const ref = ref("hello world");
 * ref.value; // "hello world"
 *
 * ref.value = "bye world";
 * ref.value; // "bye world"
 * ```
 */
export function ref<T>(): Ref<T | undefined>;
export function ref<T>(initialValue?: T): Ref<T>;

/**
 * @example
 * ```js
 * tree(() => {
 *   catchError((err) => {
 *     console.info("There is an error, lol:", err);
 *   });
 *
 *   throw new Error("Take this, dirty scope1");
 * });
 * ```
 */
export function catchError<T>(callback: (error: T) => void): void;

/**
 * @example
 * ```js
 * const id = setInterval(() => ..., 1000);
 *
 * tree((cleanup) => {
 *   cleaned(() => clearInterval(id));
 *   // ...
 *   cleanup(); // will also run callback from cleaned
 * });
 * ```
 */
export function cleaned(callback: Cleanup): void;

/**
 * @example
 * ```js
 * const signal1 = signal();
 * const signal2 = signal();
 *
 * effect(() => {
 *   signal1();
 *   untrack(() => {
 *     signal2();
 *     // I will only run when signal1 is updated.
 *   });
 * });
 * ```
 */
export function untrack<T>(callback: () => T): T;

/**
 * @example
 * ```js
 * const Theme = injection({
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
export function injection<T>(): Injection<T | undefined>;
export function injection<T>(defaultValue: T): Injection<T>;

/**
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
export function inject<T>(injection: Injection<T>): T;
