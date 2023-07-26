declare module "jail/signal" {
  type Callback<Type = any> = (currentValue: Type) => Type
  type Cleanup = () => void
  type Getter<Type = any> = () => Type
  type Signal<Type = any> = {
    (): Type
    (value: Type): void
    (update: Callback<Type>): void
  }
  type Source<Type = any> = {
    value: Type | undefined
    nodes: Node[] | null
    nodeSlots: number[] | null
  }
  type Node<Type = any> = {
    value: Type | undefined | null
    injections: Injections | null
    parentNode: Node | null
    childNodes: Node[] | null
    cleanups: Cleanup[] | null
    onupdate: Callback<Type> | null
    sources: Source[] | null
    sourceSlots: number[] | null
  }
  interface Injections {
    [ErrorInjectionKey]?: ((error: any) => void)[]
    [key: string | symbol]: any
  }
  const ErrorInjectionKey: unique symbol
  function createRoot<Type>(
    callback: (cleanup: Cleanup) => Type,
  ): Type | undefined
  function nodeRef(): Node | null
  function withNode<Type>(node: Node, getter: Getter<Type>): Type | undefined
  function onMount(callback: () => void): void
  function onUnmount(cleanup: Cleanup): void
  function on<Type>(
    dependency: () => any,
    callback: Callback<Type>,
  ): Callback<Type>
  function createEffect(callback: () => void): void
  function createEffect<Type>(callback: Callback<Type | undefined>): void
  function createEffect<Type>(
    callback: Callback<Type>,
    initialValue: Type,
  ): void
  function createComputed<Type>(
    callback: Callback<Type | undefined>,
  ): Getter<Type | undefined>
  function createComputed<Type>(
    callback: Callback<Type>,
    initialValue: Type,
  ): Getter<Type>
  function isReactive<Type>(data: Type | Getter<Type>): data is Getter<Type>
  function toValue<Type>(data: Type | Getter<Type>): Type
  function createSignal<Type>(): Signal<Type | undefined>
  function createSignal<Type>(initialValue: Type): Signal<Type>
  function catchError<Type>(callback: (error: Type) => void): void
  function onCleanup(cleanup: Cleanup): void
  function untrack<Type>(getter: Getter<Type>): Type
  function inject<Key extends keyof Injections>(
    key: Key,
  ): Injections[Key] | undefined
  function inject<Key extends keyof Injections, Default>(
    key: Key,
    defaultValue: Default | NonNullable<Injections[Key]>,
  ): Default | NonNullable<Injections[Key]>
  function inject<Type>(key: string | symbol): Type | undefined
  function inject<Type>(key: string | symbol, defaultValue: Type): Type
  function provide<Key extends keyof Injections>(
    key: Key,
    value: NonNullable<Injections[Key]>,
  ): void
  function provide<Type>(key: string | symbol, value: Type): void
  function createCallback<Callback extends (...args: any[]) => any>(
    callback: Callback,
  ): Callback
}
