/**
 * @param {HTMLElement} elt
 * @param {import("../mod.js").Binding<boolean | "true" | "false">} binding
 */
export function show(elt, binding) {
  elt.style.display = binding.value + "" === "true" ? "" : "none"
}
