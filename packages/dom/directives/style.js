/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<any>} binding
 */
export function style(elt, binding) {
  if (binding.arg) {
    elt.style[binding.arg] = binding.value ?? null
  }
}
