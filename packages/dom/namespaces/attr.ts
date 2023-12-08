import { onCleanup } from "jail/signal"
import { setAttribute } from "../helpers/mod.ts"
import { DOMElement } from "../types.d.ts"

export default function attr(elt: DOMElement, arg: string, value: unknown) {
  if (setAttribute(elt, arg, value)) {
    onCleanup(() => setAttribute(elt, arg, null))
  }
}
