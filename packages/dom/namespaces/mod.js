/// <reference path="./types.d.ts" />
import { on } from "./on.js"
import { prop } from "./prop.js"
import { use } from "./use.js"
import { attr } from "./attr.js"
import { style } from "./style.js"
import { classList } from "./class-list.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {space.Namespaces}
 */
export const namespaces = Object.create(null)
export default namespaces

namespaces.attr = attr
namespaces.prop = prop
namespaces.use = use
namespaces.on = on
namespaces.style = style
namespaces.classList = classList

export { attr, classList, on, prop, style, use }
