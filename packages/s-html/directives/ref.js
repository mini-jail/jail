/**
 * @param {Element} elt
 * @param {import("../mod.js").Binding} param1
 */
export default function (elt, { expression, context }) {
  context.$refs[expression] = elt
}
