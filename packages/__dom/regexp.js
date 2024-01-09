const validName = `[a-z][\\w\\-]*`
const validComponentName = `(?:[A-Z][a-z0-9]+)+`
const validAttributes = `(?:"[^"]*"|'[^']*'|[^'">])*`
const validValue = [
  `(?:="{{(?<slot1>\\d+)}}")`,
  `(?:='{{(?<slot2>\\d+)}}')`,
  `(?:={{(?<slot3>\\d+)}})`,
  `(?:="(?<value1>[^"]*)")`,
  `(?:='(?<value2>[^']*)')`,
  `(?:=(?<value3>[^\\s=>"']+))`,
].join("|")
export const placeholderRegExp = /{{(\d+)}}/g
export const elementRegExp = RegExp(`<[a-z\\-]+${validAttributes}>`, "g")
export const elementAttributeRegExp = RegExp(
  [
    `\\s`,
    `(?:(?:(?<namespace>${validName})|(?:{{(?<namespaceSlot>\\d+)}})):)?`,
    `(?:(?<name>${validName})|(?:{{(?<nameSlot>\\d+)}}))`,
    `(?:${validValue})?`,
  ].join(""),
  "gi",
)
export const componentRegExp = RegExp(
  [
    `<(?:(?:{{(?<slot>\\d+)}})|(?<name>${validComponentName}))`,
    `(?<attributes>${validAttributes})>`,
  ].join(""),
  "g",
)
export const componentPropsRegExp = RegExp(
  `\\s(?<name>${validName})(?:${validValue})?`,
  "gi",
)
export const closingComponentRegExp = RegExp(
  `<\\/(?:{{(\\d+)}}|${validComponentName})>`,
  "g",
)
