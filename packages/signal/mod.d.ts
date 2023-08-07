declare global {
  interface InjectionValueMap {
    [ERROR_INJECTION_KEY]?: ((error: any) => void)[]
    [key: string | symbol]: any
  }
}

export type Callback<Type = any> = (currentValue: Type) => Type
export type Cleanup = () => void
export type Getter<Type = any> = () => Type
export type Signal<Type = any> = {
  (): Type
  (value: Type): void
  (update: Callback<Type>): void
}
export type Source<Type = any> = {
  value: Type | undefined
  nodes: Node[] | null
  nodeSlots: number[] | null
}
export type Node<Type = any> = {
  value: Type | undefined | null
  injections: InjectionValueMap | null
  parentNode: Node | null
  childNodes: Node[] | null
  cleanups: Cleanup[] | null
  onupdate: Callback<Type> | null
  sources: Source[] | null
  sourceSlots: number[] | null
}
export const ERROR_INJECTION_KEY: unique symbol
export function createRoot<Type>(
  callback: (cleanup: Cleanup) => Type,
): Type | undefined
export function nodeRef(): Node | null
export function withNode<Type>(
  node: Node,
  getter: Getter<Type>,
): Type | undefined
export function onMount(callback: () => void): void
export function onUnmount(cleanup: Cleanup): void
export function on<Type>(
  dependency: () => any,
  callback: Callback<Type>,
): Callback<Type>
export function createEffect(callback: () => void): void
export function createEffect<Type>(callback: Callback<Type | undefined>): void
export function createEffect<Type>(
  callback: Callback<Type>,
  initialValue: Type,
): void
export function createComputed<Type>(
  callback: Callback<Type | undefined>,
): Getter<Type | undefined>
export function createComputed<Type>(
  callback: Callback<Type>,
  initialValue: Type,
): Getter<Type>
export function toValue<Type>(data: Type | Getter<Type>): Type
export function createSignal<Type>(): Signal<Type | undefined>
export function createSignal<Type>(initialValue: Type): Signal<Type>
export function catchError<Type>(callback: (error: Type) => void): void
export function onCleanup(cleanup: Cleanup): void
export function untrack<Type>(getter: Getter<Type>): Type
export function inject<Key extends keyof InjectionValueMap>(
  key: Key,
): InjectionValueMap[Key] | undefined
export function inject<Key extends keyof InjectionValueMap, Default>(
  key: Key,
  defaultValue: Default | NonNullable<InjectionValueMap[Key]>,
): Default | NonNullable<InjectionValueMap[Key]>
export function inject<Type>(key: string | symbol): Type | undefined
export function inject<Type>(key: string | symbol, defaultValue: Type): Type
export function provide<Key extends keyof InjectionValueMap>(
  key: Key,
  value: NonNullable<InjectionValueMap[Key]>,
): void
export function provide<Type>(key: string | symbol, value: Type): void
export function createCallback<Callback extends (...args: any[]) => any>(
  callback: Callback,
): Callback
