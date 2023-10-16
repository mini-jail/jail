import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"
import { getParams } from "https://raw.githubusercontent.com/mini-jail/deno_params/main/mod.ts"

const {
  src = "./examples/src/app.ts",
  importMap = "./import_map.json",
} = getParams()

if (src === undefined) {
  console.info("--src is missing")
  Deno.exit(1)
}

const options: BundleOptions = { importMap }

export async function createBundle(): Promise<string> {
  const { code } = await bundle(src!, options)
  console.info(`building "${src!}" done.`)
  return code
}
