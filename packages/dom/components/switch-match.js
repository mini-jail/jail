import { effect, inject, memo, provide, root } from "space/signal"

const switchKey = Symbol("Switch")

/**
 * @param {{ children?: any, fallback?: any }} props
 */
export function* Switch(props) {
  /**
   * @type {Set<{ when: boolean | "true" | "false", children: any }>}
   */
  const matchPropsSet = new Set()
  provide(switchKey, matchPropsSet)
  yield props.children
  yield memo(() => {
    return root(() => {
      for (const props of matchPropsSet) {
        if (props.when + "" === "true") {
          return props.children
        }
      }
      return props.fallback
    })
  })
}

/**
 * @param {{ when: boolean | "true" | "false", children: any }} props
 */
export function Match(props) {
  effect(() => inject(switchKey).add(props))
}
