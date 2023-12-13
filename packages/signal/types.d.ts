// deno-lint-ignore-file no-explicit-any
import type { errorSymbol } from "./mod.js"

declare global {
  namespace space {
    type Injectionkey = keyof Injections
    type Cleanup = () => void
    interface UpdateFunction<T> {
      (currentValue: T): T
    }
    interface Getter<T> {
      (): T
    }
    interface ReadOnlySignal<T> {
      (): T
    }
    interface WritableSignal<T> {
      (update: UpdateFunction<T>): void
      (value: T): void
    }
    interface Signal<T> extends ReadOnlySignal<T>, WritableSignal<T> {}
    interface Injections {
      [errorSymbol]: Array<(error: any) => void>
      [key: string | number | symbol]: unknown
    }
    interface Node<T> {
      value: T | undefined | null
      injections: Partial<Injections> | null
      parentNode: Node<any> | null
      childNodes: Node<any>[] | null
      cleanups: Cleanup[] | null
      sources: Source<any>[] | null
      sourceSlots: number[] | null
      onupdate: UpdateFunction<T> | null
    }
    interface Source<T> {
      value: T | undefined
      nodes: Node<any>[] | null
      nodeSlots: number[] | null
    }
  }
}

export {}
