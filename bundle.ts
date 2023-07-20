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

if (mode === "dev") {
  let built = false
  await createBundle()
  for await (const { kind } of Deno.watchFs([root, sourceFile])) {
    if (["access", "other"].includes(kind)) continue
    else if (built === true) continue
    await createBundle()
    built = true
    setTimeout(() => built = false, 500)
  }
} else {
  await createBundle()
}

async function createBundle() {
  console.log(`creating "${targetFile}"`)
  const { code } = await bundle(sourceFile, options)
  await Deno.writeTextFile(targetFile, code)
}
