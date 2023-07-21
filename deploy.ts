import { Application, Router } from "https://deno.land/x/oak@v10.2.0/mod.ts"
import { getParams } from "https://raw.githubusercontent.com/mini-jail/deno_params/main/mod.ts"

const { port = "8000", index = "./examples/index.html" } = getParams()
const app = new Application()
const router = new Router()

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
