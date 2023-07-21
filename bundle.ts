import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

const [
  sourceFile,
  targetFile = sourceFile + ".bundle.js",
  mode = "not_dev",
  importMap = "./import_map.json",
] = Deno.args
const options: BundleOptions = { importMap }
const root = sourceFile.split("/").at(-2)!
let built = false

createBundle()

if (mode === "dev") {
  for await (const event of Deno.watchFs([root, sourceFile])) {
    await createBundle()
  }
}

async function createBundle() {
  if (built) {
    return
  }
  built = true
  console.log(`creating "${targetFile}"`)
  const { code } = await bundle(sourceFile, options)
  await Deno.writeTextFile(targetFile, code)
  setTimeout(() => built = false, 500)
}
