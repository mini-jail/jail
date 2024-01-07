import { effect, inject, provide } from "space/signal"

const switchKey = Symbol("Switch")

/**
 * @param {{ children?: any, fallback?: any }} props
 */
export function Switch(props) {
  /**
   * @type {Set<{ when?: any, children?: any }>}
   */
  const matches = new Set()
  provide(switchKey, matches)
  return function* () {
    yield props.children
    for (const match of matches) {
      if (match.when) {
        yield match.children
        return
      }
    }
    yield props.fallback
  }
}

/**
 * @param {{ when?: boolean | "true" | "false", children?: any }} props
 */
export function Match(props) {
  effect(() => {
    inject(switchKey)?.add({
      get when() {
        return props.when + "" === "true"
      },
      get children() {
        return props.children
      },
    })
  })
}
