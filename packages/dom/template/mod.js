/// <reference path="./types.d.ts" />
import {
  closingComponentRegExp,
  componentPropsRegExp,
  componentRegExp,
  elementAttributeRegExp,
  elementRegExp,
  key,
  placeholderRegExp,
} from "../regexp/mod.js"

/**
 * @type {Map<TemplateStringsArray, space.Template>}
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
 * @returns {space.Template}
 */
export function createTemplate(templateStringsArray) {
  let template = templateCache.get(templateStringsArray)
  if (template === undefined) {
    /**
     * @type {space.TemplateData}
     */
    const data = {}, hash = "_" + Math.random().toString(36).slice(2, 7) + "_"
    let string = "", arg = 0, id = -1
    while (arg < templateStringsArray.length - 1) {
      string = string + templateStringsArray[arg] + `${key}${arg++}${key}`
    }
    string = string + templateStringsArray[arg]
    /**
     * @type {space.HTMLTemplateElement}
     */
    // @ts-expect-error: it's ok TS, it is only used internally
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
         * @type {space.AttributeData[] | null}
         */
        let attributes = null
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
        return createPlaceholder(hash, id, true)
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

/**
 * @param {space.AttributeGroups} groups
 * @returns {space.AttributeData}
 */
function createAttributeData(groups) {
  const name = groups.nameSlot ? +groups.nameSlot : groups.name
  const namespace = groups.namespaceSlot
    ? +groups.namespaceSlot
    : groups.namespace ?? null
  const slot = groups.slot1 ?? groups.slot2 ?? groups.slot3 ?? null
  const value = slot !== null
    ? +slot
    : groups.value1 ?? groups.value2 ?? groups.value3 ?? null
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
  return {
    name,
    namespace,
    slots,
    value,
    isStatic: slot === null && slots === null && namespace === null,
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
 * @param {space.ComponentGroups} groups
 * @returns {space.ComponentData}
 */
function createComponentData(groups) {
  /**
   * @type {space.ComponentDataProps}
   */
  const props = {}
  for (const match of groups.attributes.matchAll(componentPropsRegExp)) {
    /**
     * @type {space.ComponentPropsGroups}
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
