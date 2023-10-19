import { Application, Router } from "https://deno.land/x/oak@v10.2.0/mod.ts"
import { bundle } from "https://deno.land/x/emit@0.24.0/mod.ts"

const PROD = Deno.env.get("APP_PROD")! === "true"
const PORT = +Deno.env.get("APP_PORT")!
const PUBLIC = Deno.env.get("APP_PUBLIC") || Deno.cwd()
const HTML = Deno.env.get("APP_HTML")!
const TARGET = Deno.env.get("APP_TARGET")!
const SOURCE = Deno.env.get("APP_SOURCE")!
const SOURCE_ROOT = Deno.env.get("APP_SOURCE_ROOT")!
const IMPORT_MAP = Deno.env.get("APP_IMPORT_MAP")!

let build = await createBundle()

const app = new Application()
const router = new Router()

router.get(TARGET, (ctx) => {
  ctx.response.type = "js"
  ctx.response.body = build
})

app.use(router.routes())
app.use(router.allowedMethods())
app.use(async (ctx, next) => {
  try {
    await ctx.send({ root: PUBLIC, index: HTML })
  } catch {
    await next()
  }
})
app.use(async (ctx, next) => {
  try {
    await ctx.send({ root: PUBLIC, path: HTML })
  } catch {
    await next()
  }
})

app.listen({ port: PORT })

if (PROD === false) {
  runDev()
}

async function createBundle(): Promise<string> {
  const timeStart = performance.now()
  const { code } = await bundle(SOURCE, {
    importMap: IMPORT_MAP,
    compilerOptions: {
      inlineSources: !PROD,
      inlineSourceMap: !PROD,
    },
  })
  const duration = performance.now() - timeStart
  console.info(`createBundle (${duration}ms)`)
  return code
}

async function runDev() {
  let built = false
  for await (const _event of Deno.watchFs([SOURCE_ROOT, SOURCE])) {
    if (built) {
      continue
    }
    build = await createBundle()
    built = true
    setTimeout(() => built = false, 100)
  }
}
