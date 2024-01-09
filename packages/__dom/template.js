import {
  closingComponentRegExp,
  componentPropsRegExp,
  componentRegExp,
  elementAttributeRegExp,
  elementRegExp,
  placeholderRegExp,
} from "./regexp.js"

/**
 * @type {Map<TemplateStringsArray, import("space/dom").Template>}
 */
const templateCache = new Map()

/**
 * @param {string} hash
 * @param {number} id
 * @param {boolean} close
 */
function createPlaceholder(hash, id, close) {
  return `<template ${hash}="${id}">${close ? "</template>" : ""}`
}

/**
 * @param {TemplateStringsArray} templateStringsArray
 * @returns {import("space/dom").Template}
 */
export function createTemplate(templateStringsArray) {
  let template = templateCache.get(templateStringsArray)
  if (template === undefined) {
    /**
     * @type {import("space/dom").TemplateData}
     */
    const data = {}, hash = "_" + Math.random().toString(36).slice(2, 7) + "_"
    let string = "", arg = 0, id = -1
    while (arg < templateStringsArray.length - 1) {
      string = string + templateStringsArray[arg] + `{{${arg++}}}`
    }
    string = string + templateStringsArray[arg]
    /**
     * @type {import("space/dom").TemplateElement}
     */
    // @ts-ignore: tsk tsk tsk
    const elt = document.createElement("template")
    elt.innerHTML = string
      .replace(/^[\s]+/gm, "")
      .replace(componentRegExp, function () {
        const cData = createComponentData(arguments[arguments.length - 1])
        data[++id] = cData
        return createPlaceholder(hash, id, cData.selfClosing)
      })
      .replace(closingComponentRegExp, "</template>")
      .replace(elementRegExp, (match) => {
        /**
         * @type {import("space/dom").AttributeData[] | null}
         */
        let attributes = null
        match = match.replace(elementAttributeRegExp, function () {
          const aData = createAttributeData(arguments[arguments.length - 1])
          if (aData === null) {
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
        return createPlaceholder(hash, id, true)
      })
      .replace(/^\r\n|\n|\r(>)\s+(<)$/gm, "$1$2")
    template = {
      hash,
      data,
      fragment: elt.content,
    }
    templateCache.set(templateStringsArray, template)
  }
  return template
}

/**
 * @param {import("space/dom").AttributeGroups} groups
 * @returns {import("space/dom").AttributeData | null}
 */
function createAttributeData(groups) {
  const name = groups.nameSlot ? +groups.nameSlot : groups.name
  const namespace = groups.namespaceSlot
    ? +groups.namespaceSlot
    : groups.namespace ?? null
  const slot = groups.slot1 ?? groups.slot2 ?? groups.slot3 ?? null
  const value = slot !== null
    ? +slot
    : groups.value1 ?? groups.value2 ?? groups.value3 ?? true
  /**
   * @type {number[] | null}
   */
  let slots = null
  if (typeof value === "string") {
    for (const [_match, slot] of value.matchAll(placeholderRegExp)) {
      if (slots === null) {
        slots = [+slot]
      } else {
        slots.push(+slot)
      }
    }
  }
  if (slot === null && slots === null && namespace === null) {
    return null
  }
  return {
    namespace,
    name,
    value,
    slots,
  }
}

/**
 * @param {string} data
 */
function throwOnAttributeSyntaxError(data) {
  for (const _matches of data.matchAll(placeholderRegExp)) {
    throw new SyntaxError(`Unsupported Syntax\n${data}`)
  }
}

/**
 * @param {import("space/dom").ComponentGroups} groups
 * @returns {import("space/dom").ComponentData}
 */
function createComponentData(groups) {
  /**
   * @type {import("space/dom").ComponentDataProps}
   */
  const props = {}
  for (const match of groups.attributes.matchAll(componentPropsRegExp)) {
    /**
     * @type {import("space/dom").ComponentPropsGroups}
     */
    // @ts-expect-error: if it matches, it matches. it will match
    const data = match.groups
    const slot = data.slot1 ?? data.slot2 ?? data.slot3 ?? null,
      value = data.value1 ?? data.value2 ?? data.value3 ?? true
    props[data.name] = slot ? +slot : value
  }
  return {
    // @ts-expect-error: one of both must be true
    name: groups.name ? groups.name : +groups.slot,
    props,
    selfClosing: groups.attributes.endsWith("/"),
  }
}
