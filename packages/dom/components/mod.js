/// <reference path="./types.d.ts" />
import { For } from "./for.js"
import { Route, Router } from "./router.js"
import { Portal } from "./portal.js"
import { Show } from "./show.js"
import { Match, Switch } from "./switch.js"
import { ErrorBoundary } from "./error-boundary.js"

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
components.Switch = Switch
components.Match = Match
components.ErrorBoundary = ErrorBoundary

export { ErrorBoundary, For, Match, Portal, Route, Router, Show, Switch }
