import On from "./on.js"
import Prop from "./prop.js"
import Use from "./use.js"
import Attr from "./attr.js"
import Style from "./style.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {space.Namespaces}
 */
export const namespaces = Object.create(null)
export default namespaces

namespaces.attr = Attr
namespaces.prop = Prop
namespaces.use = Use
namespaces.on = On
namespaces.style = Style
