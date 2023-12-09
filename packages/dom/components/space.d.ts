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
    type RouterProps = RouterOptions & {
      type: RouterType
      routeMap: RouteMap
      children?: any
    }
    type RouterOptions = {
      fallback?: RouteHandler
    }
    type ForProps = {
      each: ComponentProps[] | (() => ComponentProps[])
      do: Component<ComponentProps>
    }
    interface Components {
      For: Component<ForProps>
      Router: Component<RouterProps>
    }
  }
}

export {}
