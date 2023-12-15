// deno-lint-ignore-file no-explicit-any
import { paramsSymbol, routesSymbol } from "./router.js"
import { switchSymbol } from "./switch.js"

declare global {
  namespace space {
    type RouterType = "pathname" | "hash"
    type Params = { readonly [param: string]: string | undefined }
    type Route = {
      path: string
      regexp: RegExp
      children: Slot
    }
    interface Injections {
      [paramsSymbol]: Params
      [routesSymbol]: Set<Route>
      [switchSymbol]: Set<Match>
    }
    type RouterProps = ComponentProps<{
      type: RouterType
      fallback?: Slot
    }>
    type RouteProps = ComponentProps<{
      path: string
      component: Component<Record<string, any>>
    }>
    type ForProps = ComponentProps<{
      each: Record<string, any>[]
      do: Component<Record<string, any>>
    }>
    type PortalProps = ComponentProps<{
      selector?: string
      mount?: Element | null
    }>
    type ShowProps = ComponentProps<{
      when: BooleanLike
      fallback?: Slot
    }>
    type SwitchProps = ComponentProps<{
      fallback?: Slot
    }>
    type MatchProps = ComponentProps<{
      when: BooleanLike
    }>
    type Match = {
      when: boolean
      children: Slot
    }
    type ErrorBoundaryProps = ComponentProps<{
      fallback?: Slot
      onError?: (error: any) => void
    }>
    interface Components {
      For: Component<ForProps>
      Router: Component<RouterProps>
      Route: Component<RouteProps>
      Portal: Component<PortalProps>
      Show: Component<ShowProps>
      Switch: Component<SwitchProps>
      Match: Component<MatchProps>
      ErrorBoundary: Component<ErrorBoundaryProps>
    }
  }
}

export {}
