import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"
import { serveFile } from "jsr:@std/http/file-server"
import { exists } from "https://deno.land/std@0.224.0/fs/mod.ts"

const [mode, sourceFile, outputFile, publicPath] = Deno.args
const bundleOptions: BundleOptions = {
  importMap: "./import_map.json",
  compilerOptions: {
    inlineSources: false,
    inlineSourceMap: false,
  },
}
let built = false

console.log("configuration", { mode, sourceFile, outputFile, publicPath })

async function serve(req: Request): Promise<Response> {
  const file = publicPath + new URL(req.url).pathname
  if (await exists(file, { isFile: true })) {
    return serveFile(req, file)
  }
  return serveFile(req, publicPath + "/index.html")
}

async function write() {
  const { code } = await bundle(sourceFile, bundleOptions)
  await Deno.writeTextFile(outputFile, code)
  console.info(`${outputFile} (${(code.length / 1000).toFixed(1)}KB)`)
}

async function watch(): Promise<void> {
  for await (const _event of Deno.watchFs(["./"])) {
    if (built) {
      continue
    }
    await write()
    built = true
    setTimeout(() => built = false, 1000)
  }
}

await write()
watch()
Deno.serve({ port: 8000 }, serve)
