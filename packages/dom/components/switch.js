import { createEffect, inject, provide } from "space/signal"

export const switchSymbol = Symbol("Switch")

/**
 * @param {space.SwitchProps} props
 */
export function Switch(props) {
  /**
   * @type {Set<space.Match>}
   */
  const matches = new Set()
  provide(switchSymbol, matches)
  return function () {
    for (const match of matches) {
      if (match.when) {
        return match.children
      }
    }
    return props.fallback
  }
}

/**
 * @param {space.MatchProps} props
 */
export function Match(props) {
  createEffect(() => {
    inject(switchSymbol)?.add({
      get when() {
        return props.when + "" === "true"
      },
      get children() {
        return props.children
      },
    })
  })
}
