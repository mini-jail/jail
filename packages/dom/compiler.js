const MODE_SLASH = 0
const MODE_TEXT = 1
const MODE_WHITESPACE = 2
const MODE_TAGNAME = 3
const MODE_COMMENT = 4
const MODE_PROP_SET = 5
const MODE_PROP_APPEND = 6
const ELEMENT_OPEN = 0
const ELEMENT_CLOSE = 1
const CHILD = 2
const PROP_SET = 3
const PROPS_ASSIGN = 4
const WHITESPACES = { " ": true, "\t": true, "\n": true, "\r": true }
/**
 * @type {Map<TemplateStringsArray, import("./mod.js").Child | import("./mod.js").Child[] | null>}
 */
const treeCache = new Map()

/**
 * Based on [htm](https://github.com/developit/htm/blob/master/src/build.mjs)
 * by [developit](https://github.com/developit).
 *
 * This guy is really great!
 * @param {TemplateStringsArray} statics
 * @returns {(number | string | boolean)[]}
 */
export function compile(statics) {
  /**
   * @type {(number | string | boolean)[]}
   */
  const flatTree = []
  let mode = MODE_TEXT, buffer = "", quote = "", propName
  /**
   * @param {number | null} slot
   */
  const submit = (slot = null) => {
    if (
      mode === MODE_TEXT &&
      (slot ?? (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, "")))
    ) {
      flatTree.push(CHILD, slot !== null ? slot - 1 : buffer)
    } else if (mode === MODE_TAGNAME && (slot ?? buffer)) {
      flatTree.push(ELEMENT_OPEN, slot !== null ? slot - 1 : buffer)
      mode = MODE_WHITESPACE
    } else if (mode === MODE_WHITESPACE && buffer === "..." && slot !== null) {
      flatTree.push(PROPS_ASSIGN, slot - 1)
    } else if (mode === MODE_WHITESPACE && buffer && slot === null) {
      flatTree.push(PROP_SET, buffer, true)
    } else if (mode >= MODE_PROP_SET) {
      if (slot ?? buffer) {
        flatTree.push(PROP_SET, propName, slot !== null ? slot - 1 : buffer)
        mode = MODE_PROP_APPEND
      }
    }
    buffer = ""
  }
  for (let i = 0; i < statics.length; i++) {
    if (mode === MODE_TEXT) {
      submit()
    }
    submit(i)
    for (let j = 0; j < statics[i].length; j++) {
      const char = statics[i][j]
      if (mode === MODE_TEXT) {
        if (char === "<") {
          submit()
          mode = MODE_TAGNAME
        } else {
          buffer += char
        }
      } else if (mode === MODE_COMMENT) {
        if (buffer === "--" && char === ">") {
          mode = MODE_TEXT
          buffer = ""
        } else {
          buffer = char + buffer[0]
        }
      } else if (quote) {
        if (char === quote) {
          quote = ""
        } else {
          buffer += char
        }
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (char === ">") {
        submit()
        mode = MODE_TEXT
      } else if (mode === MODE_SLASH) {
        // nothing to do here; see [github](https://github.com/developit/htm/blob/master/src/build.mjs#L250C25-L250C25)
      } else if (char === "=") {
        mode = MODE_PROP_SET
        propName = buffer
        buffer = ""
      } else if (
        char === "/" && (mode <= MODE_PROP_SET || statics[i][j + 1] === ">")
      ) {
        submit()
        mode = MODE_SLASH
        flatTree.push(ELEMENT_CLOSE)
      } else if (WHITESPACES[char]) {
        submit()
        mode = MODE_WHITESPACE
      } else {
        buffer += char
      }
      if (mode === MODE_TAGNAME && buffer === "!--") {
        mode = MODE_COMMENT
      }
    }
  }
  submit()
  return flatTree
}

/**
 * @param {any[]} compiled
 * @returns {import("./mod.js").Child[] | import("./mod.js").Child | null}
 */
export function createTree(compiled) {
  /**
   * @type {import("./mod.js").Tree[]}
   */
  const root = []
  /**
   * @type {import("./mod.js").Tree[]}
   */
  const stack = []
  let value, propName, type, nextTree, tree
  for (let i = 0; i < compiled.length; i++) {
    type = compiled[i]
    tree = stack.at(-1)
    if (type === ELEMENT_OPEN) {
      nextTree = { type: compiled[++i], props: null, children: null }
      stack.push(nextTree)
      if (tree) {
        if (tree.children === null) {
          tree.children = nextTree
        } else if (Array.isArray(tree.children)) {
          tree.children.push(nextTree)
        } else {
          tree.children = [tree.children, nextTree]
        }
      } else {
        root.push(nextTree)
      }
    } else if (type === ELEMENT_CLOSE) {
      stack.pop()
    } else if (type === CHILD) {
      value = compiled[++i]
      if (tree) {
        if (tree.children === null) {
          tree.children = value
        } else if (Array.isArray(tree.children)) {
          tree.children.push(value)
        } else {
          tree.children = [tree.children, value]
        }
      } else {
        root.push(value)
      }
    } else if (type === PROP_SET) {
      propName = compiled[++i]
      value = compiled[++i]
      if (tree) {
        if (tree.props === null) {
          tree.props = {}
        }
        tree.props[propName] = value
      }
    } else if (type === PROPS_ASSIGN) {
      value = compiled[++i]
      if (tree) {
        if (tree.props === null) {
          tree.props = {}
        }
        let propName = "..."
        while (tree.props[propName] !== undefined) {
          propName += "."
        }
        tree.props[propName] = value
      }
    }
  }
  switch (root.length) {
    case 0:
      return null
    case 1:
      return root[0]
    default:
      return root
  }
}

/**
 * @param {TemplateStringsArray} statics
 * @returns {import("./mod.js").Child | import("./mod.js").Child[] | null}
 */
export function getTree(statics) {
  let cached = treeCache.get(statics)
  if (cached === undefined) {
    treeCache.set(statics, cached = createTree(compile(statics)))
  }
  return cached
}
