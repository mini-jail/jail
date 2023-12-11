import { For } from "./for.js"
import { Route, Router } from "./router.js"
import { Portal } from "./portal.js"
import { Show } from "./show.js"

/**
 * ## For devs only!
 * Extend it only, if you know what you do :3
 * @type {space.Components}
 */
export const components = Object.create(null)
export default components

components.For = For
components.Router = Router
components.Route = Route
components.Portal = Portal
components.Show = Show

export { For, Portal, Route, Router, Show }
