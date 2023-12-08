import {
  componentPropsRegExp,
  componentRegExp,
  componentRegExp2,
  elementAttributeRegExp,
  elementRegExp,
  key,
  placeholderRegExp,
} from "../regexp/mod.ts"
import type {
  AttributeData,
  AttributeGroups,
  ComponentData,
  ComponentDataProps,
  ComponentGroups,
  ComponentPropsGroups,
  Data,
  Template,
} from "../types.d.ts"

const templateCache = new Map<TemplateStringsArray, Template>()

function stringArrayToString(strings: TemplateStringsArray): string {
  let data = "", arg = 0
  const length = strings.length - 1
  while (arg < length) {
    data = data + strings[arg] + `${key}${arg++}${key}`
  }
  data = data + strings[arg]
  return data
}

export function createTemplate(
  templateStringsArray: TemplateStringsArray,
): Template {
  let template = templateCache.get(templateStringsArray)
  if (template === undefined) {
    let id = -1
    const hash = "_" + Math.random().toString(36).slice(2, 7) + "_",
      data: Data = {},
      elt = document.createElement("template")
    elt.innerHTML = stringArrayToString(templateStringsArray)
      .replace(/^[\s]+/gm, "")
      .replace(componentRegExp, function () {
        const cData = createComponentData(arguments[arguments.length - 1]),
          sClosing = cData.selfClosing
        data[++id] = cData
        return `<template ${hash}="${id}">${sClosing ? "</template>" : ""}`
      })
      .replace(componentRegExp2, "</template>")
      .replace(elementRegExp, (match) => {
        let attributes: AttributeData[] | null = null
        match = match.replace(elementAttributeRegExp, function () {
          const aData = createAttributeData(arguments[arguments.length - 1])
          if (aData.isStatic) {
            return arguments[0]
          }
          if (attributes === null) {
            attributes = data[++id] = []
          }
          attributes.push(aData)
          return ` ${hash}="${id}"`
        })
        throwOnAttributeSyntaxError(match)
        return match
      })
      .replace(placeholderRegExp, (_match, key) => {
        data[++id] = +key
        return `<template ${hash}="${id}"></template>`
      })
      .replace(/^\r\n|\n|\r(>)\s+(<)$/gm, "$1$2")
    template = {
      hash,
      data,
      fragment: elt.content,
      templateString: elt.innerHTML,
    }
    templateCache.set(templateStringsArray, template)
  }
  return template
}

function createAttributeData(groups: AttributeGroups): AttributeData {
  const slot = groups.slot1 ?? groups.slot2 ?? groups.slot3 ?? null
  const value = groups.value1 ?? groups.value2 ?? groups.value3 ?? null
  const nameSlot = groups.nameSlot ? +groups.nameSlot : null
  const namespace = groups.namespace ?? null
  let slots: number[] | null = null
  if (value) {
    for (const [_match, slot] of value.matchAll(placeholderRegExp)) {
      if (slots === null) {
        slots = [+slot]
      } else {
        slots.push(+slot)
      }
    }
  }
  return {
    name: nameSlot !== null ? nameSlot : groups.name!,
    namespace: namespace,
    slots: slots,
    value: slot ? +slot : value,
    isStatic: slots === null &&
      slot === null && nameSlot === null && namespace === null,
  }
}

function throwOnAttributeSyntaxError(data: string): void {
  for (const _matches of data.matchAll(placeholderRegExp)) {
    throw new SyntaxError(`Unsupported Syntax\n${data}`)
  }
}

function createComponentData(groups: ComponentGroups): ComponentData {
  const props: ComponentDataProps = {}
  for (const match of groups.attributes.matchAll(componentPropsRegExp)) {
    const data = <ComponentPropsGroups> match.groups
    const slot = data.slot1 ?? data.slot2 ?? data.slot3 ?? null,
      value = data.value1 ?? data.value2 ?? data.value3 ?? true
    props[data.name] = slot ? +slot : value
  }
  return {
    slot: +groups.nameSlot,
    props,
    selfClosing: groups.attributes.endsWith("/"),
  }
}
