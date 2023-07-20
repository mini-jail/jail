import {
  transpile,
  type TranspileOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

const [importMap = "./import_map.json"] = Deno.args
const options: TranspileOptions = { importMap }
const fileMap = new Map<string, string>()
const root = "./packages/"

for await (const entry of Deno.readDir(root)) {
  if (entry.isDirectory === false) {
    continue
  }
  for await (const { name, isFile } of Deno.readDir(root + entry.name)) {
    if (name.endsWith(".ts") === false || isFile === false) {
      continue
    }
    const packageModule = root + `${entry.name}/${name}`
    const result = await transpile(packageModule, options)
    for (const key of result.keys()) {
      const path = key.split("/")
      const fileName = path.at(-1)!
      const packageName = path.at(-2)!
      const targetFileName = fileName.replace(".ts", ".js")
      const data = `/// <reference types="./${fileName}" />\n` + result.get(key)
      fileMap.set(root + `${packageName}/${targetFileName}`, data)
    }
  }
}

for (const [name, data] of fileMap) {
  await Deno.writeTextFile(name, data)
}
