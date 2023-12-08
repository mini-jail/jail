import type { ComponentProps, ComponentResult, ForProps } from "../types.d.ts"
import { createComputed } from "jail/signal"
import { resolve } from "../helpers/mod.ts"

export default function For<Item extends ComponentProps>(
  props: ForProps<Item>,
) {
  return createComputed<ComponentResult[]>(
    () => resolve(props.of).map(props.do),
    [],
  )
}
