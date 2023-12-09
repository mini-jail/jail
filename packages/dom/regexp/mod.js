export const key = "####"
const validPlaceholder = `${key}(\\d+)${key}`
const validName = `[a-z][\\w\\-]*`
const validComponentName = `(?:[A-Z][a-z0-9]+)+`
const validAttributes = `(?:"[^"]*"|'[^']*'|[^'">])*`
const validValue = [
  `(?:="${key}(?<slot1>\\d+)${key}")`,
  `(?:='${key}(?<slot2>\\d+)${key}')`,
  `(?:=${key}(?<slot3>\\d+)${key})`,
  `(?:="(?<value1>[^"]*)")`,
  `(?:='(?<value2>[^']*)')`,
  `(?:=(?<value3>[^\\s=>"']+))`,
].join("|")
export const placeholderRegExp = RegExp(validPlaceholder, "g")
export const elementRegExp = RegExp(`<[a-z\\-]+${validAttributes}>`, "g")
export const elementAttributeRegExp = RegExp(
  [
    `\\s`,
    `(?:(?<namespace>${validName}):)?`,
    [
      `(?:(?<name>${validName})`,
      `(?:${key}(?<nameSlot>\\d+)${key}))`,
    ].join("|"),
    `(?:${validValue})`,
  ].join(""),
  "gi",
)
export const componentRegExp = RegExp(
  [
    `<\\s*`,
    `(?:(?:${key}(?<slot>\\d+)${key})|(?<name>${validComponentName}))`,
    `(?<attributes>${validAttributes})`,
    `>`,
  ].join(""),
  "g",
)
export const componentRegExp2 = RegExp(
  `<\\s*\\/\\s*${validPlaceholder}|${validComponentName}\\s*>`,
  "g",
)
export const componentPropsRegExp = RegExp(
  `\\s(?<name>${validName})(?:${validValue})?`,
  "gi",
)
