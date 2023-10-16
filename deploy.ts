import {
  Application,
  Router,
  type RouterMiddleware,
} from "https://deno.land/x/oak@v10.2.0/mod.ts"
import { getParams } from "https://raw.githubusercontent.com/mini-jail/deno_params/main/mod.ts"
import { createBundle } from "./create_bundle.ts"

const {
  port = "8000",
  dev = "false",
  index = "./examples/index.html",
  src = "./examples/src/app.ts",
  importMap = "./import_map.json",
  appRoute = "/examples/app.bundle.js",
} = getParams()

const app = new Application()
const router = new Router()
const initialBuild = await createBundle(src, { importMap })
const frontEndApp: RouterMiddleware<string> = dev === "false"
  ? (ctx) => {
    ctx.response.type = "js"
    ctx.response.body = initialBuild
  }
  : async (ctx) => {
    ctx.response.type = "js"
    ctx.response.body = await createBundle(src, {
      importMap,
      compilerOptions: {
        inlineSources: true,
        inlineSourceMap: true,
      },
    })
  }

router.get(appRoute, frontEndApp)
app.use(router.routes())
app.use(router.allowedMethods())
app.use(async (ctx, next) => {
  try {
    await ctx.send({ root: Deno.cwd(), index })
  } catch {
    await next()
  }
})
app.use(async (ctx, next) => {
  try {
    await ctx.send({ root: Deno.cwd(), path: index })
  } catch {
    await next()
  }
})

await app.listen({ port: +port })
