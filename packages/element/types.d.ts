type $<T> = T | (() => T | undefined | null) | undefined | null
type Child =
  | boolean
  | undefined
  | null
  | number
  | string
  | Node
  | Iterable<Child>
  | (() => Child)
type Directive<T> = (element: T) => void
type AnyString = string & {}
type Boolean = boolean | "true" | "false"
type AutoCapitalize =
  | "off"
  | "none"
  | "on"
  | "sentences"
  | "words"
  | "characters"
  | AnyString
type EnterKeyHint =
  | "enter"
  | "done"
  | "go"
  | "next"
  | "previous"
  | "search"
  | "send"
type InputMode =
  | "none"
  | "text"
  | "tel"
  | "url"
  | "email"
  | "numeric"
  | "decimal"
  | "search"
type HTMLAttributeReferrerPolicy =
  | ""
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url"
type HTMLAttributeAnchorTarget =
  | "_self"
  | "_blank"
  | "_parent"
  | "_top"
  | AnyString
type AriaRole =
  | "alert"
  | "alertdialog"
  | "application"
  | "article"
  | "banner"
  | "button"
  | "cell"
  | "checkbox"
  | "columnheader"
  | "combobox"
  | "complementary"
  | "contentinfo"
  | "definition"
  | "dialog"
  | "directory"
  | "document"
  | "feed"
  | "figure"
  | "form"
  | "grid"
  | "gridcell"
  | "group"
  | "heading"
  | "img"
  | "link"
  | "list"
  | "listbox"
  | "listitem"
  | "log"
  | "main"
  | "marquee"
  | "math"
  | "menu"
  | "menubar"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "navigation"
  | "none"
  | "note"
  | "option"
  | "presentation"
  | "progressbar"
  | "radio"
  | "radiogroup"
  | "region"
  | "row"
  | "rowgroup"
  | "rowheader"
  | "scrollbar"
  | "search"
  | "searchbox"
  | "separator"
  | "slider"
  | "spinbutton"
  | "status"
  | "switch"
  | "tab"
  | "table"
  | "tablist"
  | "tabpanel"
  | "term"
  | "textbox"
  | "timer"
  | "toolbar"
  | "tooltip"
  | "tree"
  | "treegrid"
  | "treeitem"
  | AnyString
type DOMEvent<T, E> = E & { target: T }
interface EventListener<T, E> {
  (event: DOMEvent<T, E>): void
}
interface DOMEventListener<T, E> {
  (event: DOMEvent<T, E>): void
  [modifier: string]: boolean | undefined
}
type EventModifier = "prevent" | "stop" | "stopImmediate" | "once"
export interface IntrinsicHTMLAttributes {
  a: HTMLAttribute<HTMLAnchorElement>[]
}
export type HTMLAttribute<T> =
  | AriaAttribute
  | EventAttribute<T>
  | DirectiveAttribute<T>
  | PrefixedAttribute
  | ChildrenAttribute
  | StyleAttribute
  | DataSetAttribute
  | StandardAttribute
  | GlobalHTMLAttribute
  | RoleAttribute
  | LivingStandardAttribute
  | RDFaAttribute
  | NonStandardAttribute
type AriaAttribute =
  | [`aria-${string}`, $<string>]
  | [`aria${Capitalize<string>}`, $<string>]
type EventAttribute<T> = [
  `on:${keyof GlobalEventHandlersEventMap}`,
  EventListener<T, Event>,
  ...EventModifier[],
]
type ChildrenAttribute = ["children", ...Child[]]
type DirectiveAttribute<T> = [Directive<T>]
type StyleAttribute = [`style:${keyof CSSStyleDeclaration & string}`, $<string>]
type DataSetAttribute = [`data-${string}`, $<string | number | boolean>]
type PrefixedAttribute =
  | [`attr:${string}`, $<string>]
  | [`prop:${string}`, any]
type RDFaAttribute =
  | ["about", $<string>]
  | ["content", $<string>]
  | ["datatype", $<string>]
  | ["inlist", any]
  | ["prefix", $<string>]
  | ["property", $<string>]
  | ["rel", $<string>]
  | ["resource", $<string>]
  | ["rev", $<string>]
  | ["typeof", $<string>]
  | ["vocab", $<string>]
type NonStandardAttribute =
  | ["autoCorrect", $<string>]
  | ["autoSave", $<string>]
  | ["color", $<string>]
  | ["itemProp", $<string>]
  | ["itemScope", $<boolean>]
  | ["itemType", $<string>]
  | ["itemID", $<string>]
  | ["itemRef", $<string>]
  | ["results", $<number>]
  | ["security", $<string>]
  | ["unselectable", $<"on" | "off">]
type StandardAttribute =
  | ["accessKey", $<string>]
  | ["autoCapitalize", $<AutoCapitalize>]
  | ["autoFocus", $<boolean>]
  | ["class", $<string>]
  | ["className", $<string>]
  | ["contentEditable", $<Boolean | "inherit" | "plaintext-only">]
  | ["contextMenu", $<string>]
  | ["dir", $<string>]
  | ["draggable", $<Boolean>]
  | ["enterKeyHint", $<EnterKeyHint>]
  | ["hidden", $<boolean>]
  | ["id", $<string>]
  | ["lang", $<string>]
  | ["nonce", $<string>]
  | ["slot", $<string>]
  | ["spellCheck", $<boolean>]
  | ["style", $<Partial<CSSStyleDeclaration>>]
  | ["tabIndex", $<number>]
  | ["title", $<string>]
  | ["translate", $<"yes" | "no">]
type GlobalHTMLAttribute =
  | ["accept", $<string>]
  | ["acceptCharset", $<string>]
  | ["allowFullscreen", $<boolean>]
  | ["allowTransparency", $<boolean>]
  | ["alt", $<string>]
  | ["as", $<string>]
  | ["async", $<boolean>]
  | ["autoComplete", $<string>]
  | ["autoPlay", $<boolean>]
  | ["capture", $<Boolean | "user" | "environment">]
  | ["cellPadding", $<string | number>]
  | ["cellSpacing", $<string | number>]
  | ["charSet", $<string>]
  | ["challenge", $<string>]
  | ["checked", $<boolean>]
  | ["cite", $<string>]
  | ["classID", $<string>]
  | ["cols", $<number | string>]
  | ["colSpan", $<number | string>]
  | ["controls", $<boolean>]
  | ["coords", $<string>]
  | ["crossOrigin", $<"anonymous" | "use-credentials" | "">]
  | ["data", $<string>]
  | ["dateTime", $<string>]
  | ["default", $<boolean>]
  | ["defer", $<boolean>]
  | ["disabled", $<boolean>]
  | ["download", any]
  | ["encType", $<string>]
  | ["form", $<string>]
  | ["formEncType", $<string>]
  | ["formMethod", $<string>]
  | ["formNoValidate", $<Boolean>]
  | ["formTarget", $<string>]
  | ["frameBorder", $<number>]
  | ["headers", $<string>]
  | ["height", $<number>]
  | ["high", $<number>]
  | ["href", $<string>]
  | ["hrefLang", $<string>]
  | ["htmlFor", $<string>]
  | ["httpEquiv", $<string>]
  | ["integrity", $<string>]
  | ["keyParams", $<string>]
  | ["keyType", $<string>]
  | ["kind", $<string>]
  | ["label", $<string>]
  | ["list", $<string>]
  | ["loop", $<Boolean>]
  | ["low", $<number>]
  | ["manifest", $<string>]
  | ["marginHeight", $<number>]
  | ["marginWidth", $<number>]
  | ["max", $<number>]
  | ["maxLength", $<number>]
  | ["multiple", $<boolean>]
  | ["muted", $<boolean>]
  | ["name", $<string>]
  | ["noValidate", $<boolean>]
  | ["open", $<boolean>]
  | ["optimum", $<number>]
  | ["pattern", $<string>]
  | ["placeholder", $<string>]
  | ["playsInline", $<boolean>]
  | ["poster", $<string>]
  | ["preload", $<string>]
  | ["readOnly", $<boolean>]
  | ["required", $<boolean>]
  | ["reversed", $<boolean>]
  | ["rows", $<number>]
  | ["rowSpan", $<number>]
  | ["sandbox", $<string>]
  | ["scope", $<string>]
  | ["scoped", $<boolean>]
  | ["scrolling", $<string>]
  | ["seamless", $<boolean>]
  | ["selected", $<boolean>]
  | ["shape", $<string>]
  | ["size", $<number>]
  | ["sizes", $<string>]
  | ["span", $<number>]
  | ["src", $<string>]
  | ["srcDoc", $<string>]
  | ["srcLang", $<string>]
  | ["srcSet", $<string>]
  | ["start", $<number>]
  | ["step", $<number | string>]
  | ["summary", $<string>]
  | ["target", $<string>]
  | ["type", $<string>]
  | ["useMap", $<string>]
  | ["value", $<string | string[] | number>]
  | ["width", $<number | string>]
  | ["wmode", $<string>]
  | ["wrap", $<string>]
type RoleAttribute = ["role", $<AriaRole>]
type LivingStandardAttribute =
  | ["inputMode", $<InputMode>]
  | ["is", $<string>]
