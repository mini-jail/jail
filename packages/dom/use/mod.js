import { Animate } from "./animate.js"
import { If } from "./if.js"
import { Show } from "./show.js"
import { Text } from "./text.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {space.Directives}
 */
export const directives = Object.create(null)
export default directives

directives.Animate = Animate
directives.If = If
directives.Show = Show
directives.Text = Text
