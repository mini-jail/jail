import {
  transpile,
  type TranspileOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

const packageNames = ["signal", "dom", "dom-router"]
const options: TranspileOptions = {
  importMap: "./importmap.json",
  compilerOptions: {},
}

for (const packageName of packageNames) {
  const result = await transpile(`./packages/${packageName}/mod.ts`, options)
  let data = `/// <reference types="./mod.ts" />\n`
  data = data + result.get([...result.keys()][0])!
  Deno.writeTextFile(`./packages/${packageName}/mod.js`, data)
}
