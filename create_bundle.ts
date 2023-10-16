import {
  bundle,
  type BundleOptions,
} from "https://deno.land/x/emit@0.24.0/mod.ts"

export async function createBundle(
  sourceFile: string,
  options?: BundleOptions,
): Promise<string> {
  const { code } = await bundle(sourceFile, options)
  console.info(`building "${sourceFile}" done.`)
  return code
}
