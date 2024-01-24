/**
 * @param {import("../mod.js").DOMElement} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { evaluate }) {
  const isTrue = evaluate() + "" === "true"
  elt.style.display = isTrue ? "" : "none"
}
