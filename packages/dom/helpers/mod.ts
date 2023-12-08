// deno-lint-ignore-file no-explicit-any
import type { DOMElement, ResolvedValue } from "../types.d.ts"

export function setAttribute(
  elt: DOMElement,
  name: string,
  value: unknown,
): boolean {
  name = name.replace(/([A-Z])/g, "-$1").toLowerCase()
  if (value != null) {
    elt.setAttribute(name, value + "")
    return true
  }
  elt.removeAttribute(name)
  return false
}

export function setPropertyOrAttribute(
  elt: DOMElement,
  name: string,
  value: unknown,
): void {
  if (name in elt) {
    elt[name] = value
  } else {
    setAttribute(elt, name, value)
  }
}

export function isResolvable(data: unknown): data is () => any {
  return typeof data === "function" ? data.length > 0 ? false : true : false
}

export function resolve<Type>(data: Type): ResolvedValue<Type> {
  return isResolvable(data) ? data() : data
}
