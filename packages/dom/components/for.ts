import { createComputed } from "jail/signal"
import type { ComponentResult, ForProps } from "../types.d.ts"
import { resolve } from "../helpers/mod.ts"

export default function For(props: ForProps) {
  return createComputed<ComponentResult[]>(() => {
    return resolve(props.of).map((item) => props.do(item))
  }, [])
}
