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

await createBundle()

if (mode === "dev") {
  let built = false
  for await (const { kind } of Deno.watchFs([root, sourceFile])) {
    if (built || ["access", "other"].includes(kind)) {
      continue
    }
    await createBundle()
    built = true
    setTimeout(() => built = false, 500)
  }
}

async function createBundle() {
  console.log(`creating "${targetFile}"`)
  const { code } = await bundle(sourceFile, options)
  await Deno.writeTextFile(targetFile, code)
}
