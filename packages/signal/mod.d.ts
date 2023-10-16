// deno-lint-ignore-file no-explicit-any
export type Injectionkey = string | symbol
export interface Injections {
  [key: Injectionkey]: any
}
export type UpdateFunction<Type = any> = (currentValue: Type) => Type
export type Cleanup = () => void
export type Getter<Type = any> = () => Type
export interface ReadOnlySignal<Type = any> {
  (): Type
}
export interface WritableSignal<Type = any> {
  (update: UpdateFunction<Type>): void
  (value: Type): void
}
export interface Signal<Type = any>
  extends ReadOnlySignal<Type>, WritableSignal<Type> {}
export type Source<Type = any> = {
  value: Type | undefined
  nodes: Node[] | null
  nodeSlots: number[] | null
}
export type Node<Type = any> = {
  value: Type | undefined | null
  injections: Injections | null
  parentNode: Node | null
  childNodes: Node[] | null
  cleanups: Cleanup[] | null
  onupdate: UpdateFunction<Type> | null
  sources: Source[] | null
  sourceSlots: number[] | null
}
export function createRoot<Type>(
  rootFunction: (cleanup: Cleanup) => Type,
): Type | undefined
export function onMount(mountFunction: () => void): void
export function onUnmount(cleanupFunction: Cleanup): void
export function createEffect(effectFunction: () => void): Cleanup
export function createEffect<Type>(
  effectFunction: UpdateFunction<Type | undefined>,
): Cleanup
export function createEffect<Type>(
  effectFunction: UpdateFunction<Type>,
  initialValue: Type,
): Cleanup
export function createComputed<Type>(
  effectFunction: UpdateFunction<Type | undefined>,
): ReadOnlySignal<Type | undefined>
export function createComputed<Type>(
  effectFunction: UpdateFunction<Type>,
  initialValue: Type,
): ReadOnlySignal<Type>
export function createSignal<Type>(): Signal<Type | undefined>
export function createSignal<Type>(initialValue: Type): Signal<Type>
export function catchError<Type>(errorFunction: (error: Type) => void): void
export function onCleanup(cleanupFunction: Cleanup): void
export function untrack<Type>(getter: Getter<Type>): Type
export function inject<Type>(key: Injectionkey): Type | undefined
export function inject<Type>(key: Injectionkey, defaultValue: Type): Type
export function provide<Type>(key: Injectionkey, value: Type): void
