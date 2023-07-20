import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

const [sourceFile, targetFile, importMap = "./import_map.json"] = Deno.args
const options: BundleOptions = { importMap }
const { code } = await bundle(sourceFile, options)

if (targetFile) {
  await Deno.writeTextFile(targetFile, code)
} else {
  console.log(code)
}
