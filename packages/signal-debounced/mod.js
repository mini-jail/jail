import { effect, signal } from "space/signal"
/**
 * @template Type
 * @param {() => Type} fn
 * @param {number} [timeout]
 */
export function debounced(fn, timeout) {
  const debounced = signal()
  effect(/** @param {number | undefined} id */ (id) => {
    clearTimeout(id)
    const value = fn()
    if (id === undefined) {
      queueMicrotask(() => debounced(fn()))
      return -1
    }
    return setTimeout(() => debounced(value), timeout)
  })
  return () => debounced()
}
