import { pull, push } from "space/signal"
/**
 * @template Type, Action
 * @typedef {{
 *   (): Type
 *   (action: Action): void
 * }} Reducer
 */
/**
 * @template Type, Action
 * @overload
 * @param {(value: Type | undefined, action: Action) => Type} reducer
 * @returns {Reducer<Type | undefined, Action>}
 */
/**
 * @template Type, Action
 * @overload
 * @param {(value: Type, action: Action) => Type} reducer
 * @param {Type} value
 * @returns {Reducer<Type, Action>}
 */
export function reducer(reducer, value) {
  // @ts-ignore: this is fine
  return function Reducer() {
    if (arguments.length) {
      value = reducer(value, arguments[0])
      return pull(Reducer)
    }
    push(Reducer)
    return value
  }
}
