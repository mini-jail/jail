import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"
import { getParams } from "https://raw.githubusercontent.com/mini-jail/deno_params/main/mod.ts"

const { src, target, dev = "false", importMap = "./import_map.json" } =
  getParams()

if (src === undefined) {
  console.info("--src is missing")
  Deno.exit(1)
}

if (target === undefined) {
  console.info("--target is missing")
  Deno.exit(1)
}

const options: BundleOptions = { importMap }
const root = src.split("/").at(-2)!
let built = false

await createBundle()

if (dev === "true") {
  for await (const event of Deno.watchFs([root, src])) {
    await createBundle()
  }
}

async function createBundle() {
  if (built) {
    return
  }
  built = true
  console.log(`creating "${target!}"`)
  const { code } = await bundle(target!, options)
  await Deno.writeTextFile(target!, code)
  setTimeout(() => built = false, 500)
}
