import { State } from "space/signal"
/**
 * @template Type, Action
 * @extends {State<Type>}
 */
export class Reducer extends State {
  /**
   * @private
   */
  reducer
  /**
   * @param {(value: Type, action: Action) => Type} reducer
   * @param {Type} [value]
   */
  constructor(reducer, value) {
    super(value)
    this.reducer = reducer
  }
  /**
   * @override
   */
  get value() {
    return super.value
  }
  /**
   * @param {Action} action
   */
  dispatch(action) {
    super.value = this.reducer(this.value, action)
  }
}
/**
 * @template Type, Action
 * @param {(value: Type, action: Action) => Type} reducer
 * @param {Type} [value]
 * @returns {Reducer<Type, Action>}
 */
export function reducer(reducer, value) {
  return new Reducer(reducer, value)
}
