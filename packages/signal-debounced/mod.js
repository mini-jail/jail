import { effect, State } from "space/signal"
/**
 * @template Type
 * @extends {State<Type>}
 */
export class Debounced extends State {
  timeout
  /**
   * @param {(() => Type) | State<Type>} fnOrState
   * @param {number} [timeout]
   */
  constructor(fnOrState, timeout) {
    super()
    this.timeout = timeout ?? 0
    effect(/** @param {number | undefined} id */ (id) => {
      clearTimeout(id)
      const value = resolve(fnOrState)
      if (id === undefined) {
        queueMicrotask(() => super.value = resolve(fnOrState))
        return -1
      }
      return setTimeout(() => super.value = value, this.timeout)
    })
  }
  /**
   * @override
   */
  get value() {
    return super.value
  }
}
/**
 * @template Type
 * @param {() => Type} fn
 * @param {number} [timeout]
 */
export function debounced(fn, timeout) {
  return new Debounced(fn, timeout)
}
/**
 * @template Type
 * @param {State<Type> | (() => Type)} data
 * @returns {Type}
 */
function resolve(data) {
  if (typeof data === "function") {
    return data()
  }
  return data.value
}
