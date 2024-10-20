import { Effect, State } from "space/signal"
/**
 * @template Type
 * @extends {State<Type | undefined>}
 */
export class Ressource extends State {
  /**
   * @private
   */
  _error = new State(/** @type {Error?} */ (null))
  /**
   * @private
   */
  _loading = new State(false)
  /**
   * @param {() => Promise<Type>} fn
   */
  constructor(fn) {
    super()
    new Effect(() => {
      this._loading.value = true
      fn()
        .then((value) => {
          this._error.value = null
          super.value = value
        })
        .catch((error) => {
          super.value = undefined
          this._error.value = error
        })
        .finally(() => {
          this._loading.value = false
        })
    })
  }
  /**
   * @override
   */
  get value() {
    if (this._loading.value || this._error.value !== null) {
      return undefined
    }
    return super.value
  }
  get error() {
    return this._error.value
  }
  get isLoading() {
    return this._loading.value
  }
}
/**
 * @template Type
 * @param {() => Promise<Type>} fn
 */
export function ressource(fn) {
  return new Ressource(fn)
}
