import type { ErrorInjectionKey } from "./mod.js"

declare global {
  interface InjectionMap {
    [ErrorInjectionKey]?: ErrorCallback[]
    [key: string | symbol]: any
  }
}

export type ErrorCallback<Type = any> = (error: Type) => void

export type Callback<Type> = (currentValue: Type) => Type

export type Cleanup = () => void

export type SettableSignal<Type = any> = (value: Type) => void

export type UpdatableSignal<Type = any> = (callback: Callback<Type>) => void

export interface Signal<Type = any>
  extends SettableSignal<Type>, UpdatableSignal<Type> {
  (): Type
}

export type Source<Type = any> = {
  value: Type | undefined
  nodes: Node[] | null
  nodeSlots: number[] | null
}

export type Node<Type = any> = {
  value: Type | undefined | null
  injectionMap: InjectionMap | null
  parentNode: Node | null
  childNodes: Node[] | null
  cleanups: Cleanup[] | null
  onupdate: Callback<Type> | null
  sources: Source[] | null
  sourceSlots: number[] | null
}
