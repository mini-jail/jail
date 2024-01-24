export const templateRE = /{{([^]+?)}}/g
export const dynamicKeyRE = /\[([^]+)\]/
export const attrRE = /^(?<n>[^:.\s]+)(?::(?<a>[^.\s]+))?(?:.(?<m>\S+))?/i
export const forAliasRE = /^\s*(?<a>\S+)\s+in\s+(?<e>.+)/
export const forAliasIndexRE = /^\s*\((?<a>\S+),\s*(?<i>\S+)\)\s+in\s+(?<e>.+)/
