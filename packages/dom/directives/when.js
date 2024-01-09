/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<boolean | "true" | "false">} binding
 */
export function when(elt, binding) {
  if (elt["__when"] === undefined) {
    elt["__when"] = new Text()
  }
  const isTrue = binding.value + "" === "true",
    target = isTrue ? elt["__when"] : elt
  target.replaceWith(isTrue ? elt : elt["__when"])
}
