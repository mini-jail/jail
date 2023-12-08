export const key = "####"
const placeholderS = `${key}(\\d+)${key}`
const nameS = `[a-z][\\w\\-]*`
const attributesS = `(?:"[^"]*"|'[^']*'|[^'">])*`
const valueS = [
  `(?:="${key}(?<slot1>\\d+)${key}")`,
  `(?:='${key}(?<slot2>\\d+)${key}')`,
  `(?:=${key}(?<slot3>\\d+)${key})`,
  `(?:="(?<value1>[^"]*)")`,
  `(?:='(?<value2>[^']*)')`,
  `(?:=(?<value3>[^\\s=>"']+))`,
].join("|")
export const placeholderRegExp = RegExp(placeholderS, "g")
export const elementRegExp = RegExp(`<[a-z\\-]+${attributesS}>`, "g")
export const elementAttributeRegExp = RegExp(
  [
    `\\s`,
    `(?:(?<namespace>${nameS}):)?`,
    [
      `(?:(?<name>${nameS})`,
      `(?:${key}(?<nameSlot>\\d+)${key}))`,
    ].join("|"),
    `(?:${valueS})`,
  ].join(""),
  "gi",
)
export const componentRegExp = RegExp(
  [
    `<\\s*`,
    `(?:${key}(?<nameSlot>\\d+)${key})`,
    `(?<attributes>${attributesS})`,
    `>`,
  ].join(""),
  "g",
)
export const componentRegExp2 = RegExp(`<\\s*\\/\\s*${placeholderS}\\s*>`, "g")
export const componentPropsRegExp = RegExp(
  `\\s(?<name>${nameS})(?:${valueS})?`,
  "gi",
)
