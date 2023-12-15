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
