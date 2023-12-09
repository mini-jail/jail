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
    type RouterProps = RouterOptions & {
      type: RouterType
      routeMap: RouteMap
      children: RenderResult
    }
    type RouterOptions = {
      fallback?: RouteHandler
    }
    type ForProps = {
      each: Resolvable<ComponentProps[]>
      do: Component<ComponentProps>
      children: RenderResult
    }
    type PortalProps = {
      selector?: string
      children: RenderResult
    }
    interface Components {
      For: Component<ForProps>
      Router: Component<RouterProps>
      Portal: Component<PortalProps>
    }
  }
}

export {}
