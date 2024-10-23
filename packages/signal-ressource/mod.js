import { effect, State } from "space/signal"
/**
 * @template Type
 * @extends {State<Type | undefined>}
 */
export class Ressource extends State {
  /**
   * @private
   */
  errorState = new State(/** @type {Error?} */ (null))
  /**
   * @private
   */
  loadingState = new State(false)
  /**
   * @param {() => Promise<Type>} fn
   */
  constructor(fn) {
    super()
    effect(() => {
      this.loadingState.value = true
      fn()
        .then((value) => {
          this.errorState.value = null
          super.value = value
        })
        .catch((error) => {
          super.value = undefined
          this.errorState.value = error
        })
        .finally(() => {
          this.loadingState.value = false
        })
    })
  }
  /**
   * @override
   */
  get value() {
    if (this.loadingState.value || this.errorState.value !== null) {
      return undefined
    }
    return super.value
  }
  get error() {
    return this.errorState.value
  }
  get isLoading() {
    return this.loadingState.value
  }
}
/**
 * @template Type
 * @param {() => Promise<Type>} fn
 */
export function ressource(fn) {
  return new Ressource(fn)
}
