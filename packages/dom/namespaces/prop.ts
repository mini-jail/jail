import { onCleanup } from "jail/signal"
import type { DOMElement } from "../types.d.ts"

export default function prop(
  elt: DOMElement,
  arg: PropertyKey,
  value: unknown,
) {
  const previousValue = elt[arg]
  elt[arg] = value
  onCleanup(() => elt[arg] = previousValue)
}
