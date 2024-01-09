/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<string>} binding
 */
export function text(elt, binding) {
  if (elt["__text"] === undefined) {
    elt["__text"] = new Text()
    elt.prepend(elt["__text"])
  }
  elt["__text"].data = binding.value + ""
}
