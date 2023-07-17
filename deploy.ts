import { Application, Router } from "https://deno.land/x/oak@v10.2.0/mod.ts"

const app = new Application()
const router = new Router()

app.use(router.routes())
app.use(router.allowedMethods())
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: Deno.cwd(),
      index: "examples/index.html",
    })
  } catch {
    await next()
  }
})
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: Deno.cwd(),
      path: "examples/index.html",
    })
  } catch {
    await next()
  }
})

await app.listen({ port: 8000 })
