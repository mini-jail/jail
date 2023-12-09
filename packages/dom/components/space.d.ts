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
    type RouterProps = ComponentProps<
      RouterOptions & {
        type: RouterType
        routeMap: RouteMap
      }
    >
    type RouterOptions = {
      fallback?: RouteHandler
    }
    type ForProps = ComponentProps<{
      each: Resolvable<Record<string, any>[]>
      do: Component<Record<string, any>>
    }>
    type PortalProps = ComponentProps<{
      selector?: string
      mount?: Element
    }>
    interface Components {
      For: Component<ForProps>
      Router: Component<RouterProps>
      Portal: Component<PortalProps>
    }
  }
}

export {}
