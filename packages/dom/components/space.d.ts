// deno-lint-ignore-file no-explicit-any
import { paramsSymbol } from "./router.js"

declare global {
  namespace space {
    type RouterType = "pathname" | "hash"
    type Params = { readonly [param: string]: string | undefined }
    type RouteHandler = () => Slot
    type Route = {
      path: string
      regexp: RegExp
      handler: RouteHandler
    }
    interface Injections {
      [paramsSymbol]?: Params
    }
    type RouteMap = { readonly [path: string]: RouteHandler }
    type RouterProps = ComponentProps<{
      type: RouterType
      routeMap: RouteMap
      fallback?: RouteHandler
    }>
    type ForProps = ComponentProps<{
      each: Record<string, any>[]
      do: Component<Record<string, any>>
    }>
    type PortalProps = ComponentProps<{
      selector?: string
      mount?: Element
    }>
    type ShowProps = ComponentProps<{
      when: BooleanLike
      fallback?: Slot
    }>
    interface Components {
      For: Component<ForProps>
      Router: Component<RouterProps>
      Portal: Component<PortalProps>
      Show: Component<ShowProps>
    }
  }
}

export {}
