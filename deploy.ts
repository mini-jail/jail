import { Application, Router } from "https://deno.land/x/oak@v10.2.0/mod.ts"
import { getParams } from "https://raw.githubusercontent.com/mini-jail/deno_params/main/mod.ts"
import { createBundle } from "./create_bundle.ts"

const {
  port = "8000",
  dev = "false",
  index = "./examples/index.html",
  src = "./examples/src/app.ts",
  appRoute = "/examples/app.js",
  importMap = "./import_map.json",
} = getParams()

const app = new Application()
const router = new Router()
const initialBuild = await createBundle(src, { importMap })

if (dev === "false") {
  router.get(appRoute, (ctx) => {
    ctx.response.type = "js"
    ctx.response.body = initialBuild
  })
} else {
  router.get(appRoute, async (ctx) => {
    ctx.response.type = "js"
    ctx.response.body = await createBundle(src, {
      importMap,
      compilerOptions: {
        inlineSources: true,
        inlineSourceMap: true,
      },
    })
  })
}

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
