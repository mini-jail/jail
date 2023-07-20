import {
  transpile,
  type TranspileOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

const [importMap = "./import_map.json"] = Deno.args
const options: TranspileOptions = { importMap }
const fileMap = new Map<string, string>()
const root = "./packages/"

for await (const entry of Deno.readDir(root)) {
  if (entry.isDirectory) {
    for await (const packageEntry of Deno.readDir(root + entry.name)) {
      if (packageEntry.name.endsWith(".ts") === false) {
        continue
      }
      const fileName = root + `${entry.name}/${packageEntry.name}`
      const result = await transpile(fileName, options)
      for (const key of result.keys()) {
        const path = key.split("/")
        const fileName = path.at(-1)!
        const targetName = fileName.replace(".ts", ".js")
        const packageName = path.at(-2)!
        if (fileMap.has(packageName)) {
          continue
        }
        let data = `/// <reference types="./${fileName}" />\n`
        data = data + result.get(key)
        fileMap.set(root + `${packageName}/${targetName}`, data)
      }
    }
  }
}

for (const [name, data] of fileMap) {
  await Deno.writeTextFile(name, data)
}
