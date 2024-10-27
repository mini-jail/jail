type $<T> = T | null | undefined | (() => T | null | undefined)
type Child =
  | undefined
  | null
  | boolean
  | number
  | string
  | Node
  | Iterable<Child>
  | (() => Child)
type BooleanLike = boolean | "true" | "false"
type AutoCapitalize =
  | "off"
  | "none"
  | "on"
  | "sentences"
  | "words"
  | "characters"
  | string & {}
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
  | string & {}
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
  | string & {}
interface DOMEventTarget<Target> {
  target: Target
  currentTarget: Document
}
type DOMEvent<Target, Event> = Event & DOMEventTarget<Target>
interface DOMEventListener<Target, Event> {
  (event: DOMEvent<Target, Event>): void
  options?: EventOptions
}
interface EventOptions {
  prevent?: boolean
  stop?: boolean
  stopImmediate?: boolean
  once?: boolean
}
export interface HTMLAttributes<Element>
  extends
    AriaAttributes,
    EventAttributes<Element>,
    PrefixedEventAttributes<Element>,
    Ref<Element>,
    PrefixedAttributes,
    Children,
    PrefixedStyleAttributes,
    DataSetAttributes,
    StandardAttributes,
    GlobalHTMLAttributes,
    Role,
    LivingStandardAttributes,
    RDFaAttributes,
    NonStandardAttributes {}
interface LivingStandardAttributes {
  inputMode?: $<InputMode>
  is?: $<string>
}
interface Ref<Element> {
  ref?: (elt: Element) => void
}
interface Children {
  children?: Child
}
interface Role {
  role?: $<AriaRole>
}
interface AriaAttributes {
  [ariaAttribute: `aria-${string}`]: $<string | boolean>
  [ariaProperty: `aria${Capitalize<string>}`]: $<string | boolean>
}
type EventHandler<Target, Event> = DOMEventListener<Target, Event> | [
  DOMEventListener<Target, Event>,
  EventOptions?,
]
interface PrefixedEventAttributes<Target> {
  [name: `on:${string}`]: EventHandler<Target, Event>
}
interface EventAttributes<Target> {
  onAbort?: EventHandler<Target, UIEvent>
  onAnimationCancel?: EventHandler<Target, AnimationEvent>
  onAnimationEnd?: EventHandler<Target, AnimationEvent>
  onAnimationIteration?: EventHandler<Target, AnimationEvent>
  onAnimationStart?: EventHandler<Target, AnimationEvent>
  onAuxClick?: EventHandler<Target, MouseEvent>
  onBeforeInput?: EventHandler<Target, InputEvent>
  onBeforeToggle?: EventHandler<Target, Event>
  onBlur?: EventHandler<Target, FocusEvent>
  onCancel?: EventHandler<Target, Event>
  onCanPlay?: EventHandler<Target, Event>
  onCanPlaythrough?: EventHandler<Target, Event>
  onChange?: EventHandler<Target, Event>
  onClick?: EventHandler<Target, MouseEvent>
  onClose?: EventHandler<Target, Event>
  onCompositionEnd?: EventHandler<Target, CompositionEvent>
  onCompositionStart?: EventHandler<Target, CompositionEvent>
  onCompositionUpdate?: EventHandler<Target, CompositionEvent>
  onContextLost?: EventHandler<Target, Event>
  onContextMenu?: EventHandler<Target, MouseEvent>
  onContextRestored?: EventHandler<Target, Event>
  onCopy?: EventHandler<Target, ClipboardEvent>
  onCueChange?: EventHandler<Target, Event>
  onCut?: EventHandler<Target, ClipboardEvent>
  onDblClick?: EventHandler<Target, MouseEvent>
  onDrag?: EventHandler<Target, DragEvent>
  onDragEnd?: EventHandler<Target, DragEvent>
  onDragEnter?: EventHandler<Target, DragEvent>
  onDragLeave?: EventHandler<Target, DragEvent>
  onDragOver?: EventHandler<Target, DragEvent>
  onDragStart?: EventHandler<Target, DragEvent>
  onDrop?: EventHandler<Target, DragEvent>
  onDurationChange?: EventHandler<Target, Event>
  onEmptied?: EventHandler<Target, Event>
  onEnded?: EventHandler<Target, Event>
  onError?: EventHandler<Target, ErrorEvent>
  onFocus?: EventHandler<Target, FocusEvent>
  onFocusIn?: EventHandler<Target, FocusEvent>
  onFocusOut?: EventHandler<Target, FocusEvent>
  onFormdata?: EventHandler<Target, FormDataEvent>
  onGotPointerCapture?: EventHandler<Target, PointerEvent>
  onInput?: EventHandler<Target, Event>
  onInvalid?: EventHandler<Target, Event>
  onKeyDown?: EventHandler<Target, KeyboardEvent>
  onKeyPress?: EventHandler<Target, KeyboardEvent>
  onKeyUp?: EventHandler<Target, KeyboardEvent>
  onLoad?: EventHandler<Target, Event>
  onLoadedData?: EventHandler<Target, Event>
  onLoadedMetadata?: EventHandler<Target, Event>
  onLoadStart?: EventHandler<Target, Event>
  onLostPointerCapture?: EventHandler<Target, PointerEvent>
  onMouseDown?: EventHandler<Target, MouseEvent>
  onMouseEnter?: EventHandler<Target, MouseEvent>
  onMouseLeave?: EventHandler<Target, MouseEvent>
  onMouseMove?: EventHandler<Target, MouseEvent>
  onMouseOut?: EventHandler<Target, MouseEvent>
  onMouseOver?: EventHandler<Target, MouseEvent>
  onMouseUp?: EventHandler<Target, MouseEvent>
  onPaste?: EventHandler<Target, ClipboardEvent>
  onPause?: EventHandler<Target, Event>
  onPlay?: EventHandler<Target, Event>
  onPlaying?: EventHandler<Target, Event>
  onPointerCancel?: EventHandler<Target, PointerEvent>
  onPointerDown?: EventHandler<Target, PointerEvent>
  onPointerEnter?: EventHandler<Target, PointerEvent>
  onPointerLeave?: EventHandler<Target, PointerEvent>
  onPointerMove?: EventHandler<Target, PointerEvent>
  onPointerOut?: EventHandler<Target, PointerEvent>
  onPointerOver?: EventHandler<Target, PointerEvent>
  onPointerUp?: EventHandler<Target, PointerEvent>
  onProgress?: EventHandler<Target, ProgressEvent>
  onRateChange?: EventHandler<Target, Event>
  onReset?: EventHandler<Target, Event>
  onResize?: EventHandler<Target, UIEvent>
  onScroll?: EventHandler<Target, Event>
  onScrollEnd?: EventHandler<Target, Event>
  onSecurityPolicyViolation?: EventHandler<Target, SecurityPolicyViolationEvent>
  onSeeked?: EventHandler<Target, Event>
  onSeeking?: EventHandler<Target, Event>
  onSelect?: EventHandler<Target, Event>
  onSelectionChange?: EventHandler<Target, Event>
  onSelectStart?: EventHandler<Target, Event>
  onSlotChange?: EventHandler<Target, Event>
  onStalled?: EventHandler<Target, Event>
  onSubmit?: EventHandler<Target, SubmitEvent>
  onSuspend?: EventHandler<Target, Event>
  onTimeUpdate?: EventHandler<Target, Event>
  onToggle?: EventHandler<Target, Event>
  onTouchCancel?: EventHandler<Target, TouchEvent>
  onTouchEnd?: EventHandler<Target, TouchEvent>
  onTouchMove?: EventHandler<Target, TouchEvent>
  onTouchStart?: EventHandler<Target, TouchEvent>
  onTransitionCancel?: EventHandler<Target, TransitionEvent>
  onTransitionEnd?: EventHandler<Target, TransitionEvent>
  onTransitionRun?: EventHandler<Target, TransitionEvent>
  onTransitionStart?: EventHandler<Target, TransitionEvent>
  onVolumeChange?: EventHandler<Target, Event>
  onWaiting?: EventHandler<Target, Event>
  onWheel?: EventHandler<Target, WheelEvent>
}
interface PrefixedAttributes {
  [unknownAttribute: `attr:${string}`]: $<string>
  [unknownProperty: `prop:${string}`]: any
}
interface DataSetAttributes {
  [dataAttribute: `data-${string}`]: $<string | number | boolean>
}
interface CSSProperties {
  accentColor?: $<string>
  alignContent?: $<string>
  alignItems?: $<string>
  alignSelf?: $<string>
  alignmentBaseline?: $<string>
  all?: $<string>
  animation?: $<string>
  animationComposition?: $<string>
  animationDelay?: $<string>
  animationDirection?: $<string>
  animationDuration?: $<string>
  animationFillMode?: $<string>
  animationIterationCount?: $<string>
  animationName?: $<string>
  animationPlayState?: $<string>
  animationTimingFunction?: $<string>
  appearance?: $<string>
  aspectRatio?: $<string>
  backdropFilter?: $<string>
  backfaceVisibility?: $<string>
  background?: $<string>
  backgroundAttachment?: $<string>
  backgroundBlendMode?: $<string>
  backgroundClip?: $<string>
  backgroundColor?: $<string>
  backgroundImage?: $<string>
  backgroundOrigin?: $<string>
  backgroundPosition?: $<string>
  backgroundPositionX?: $<string>
  backgroundPositionY?: $<string>
  backgroundRepeat?: $<string>
  backgroundSize?: $<string>
  baselineShift?: $<string>
  baselineSource?: $<string>
  blockSize?: $<string>
  border?: $<string>
  borderBlock?: $<string>
  borderBlockColor?: $<string>
  borderBlockEnd?: $<string>
  borderBlockEndColor?: $<string>
  borderBlockEndStyle?: $<string>
  borderBlockEndWidth?: $<string>
  borderBlockStart?: $<string>
  borderBlockStartColor?: $<string>
  borderBlockStartStyle?: $<string>
  borderBlockStartWidth?: $<string>
  borderBlockStyle?: $<string>
  borderBlockWidth?: $<string>
  borderBottom?: $<string>
  borderBottomColor?: $<string>
  borderBottomLeftRadius?: $<string>
  borderBottomRightRadius?: $<string>
  borderBottomStyle?: $<string>
  borderBottomWidth?: $<string>
  borderCollapse?: $<string>
  borderColor?: $<string>
  borderEndEndRadius?: $<string>
  borderEndStartRadius?: $<string>
  borderImage?: $<string>
  borderImageOutset?: $<string>
  borderImageRepeat?: $<string>
  borderImageSlice?: $<string>
  borderImageSource?: $<string>
  borderImageWidth?: $<string>
  borderInline?: $<string>
  borderInlineColor?: $<string>
  borderInlineEnd?: $<string>
  borderInlineEndColor?: $<string>
  borderInlineEndStyle?: $<string>
  borderInlineEndWidth?: $<string>
  borderInlineStart?: $<string>
  borderInlineStartColor?: $<string>
  borderInlineStartStyle?: $<string>
  borderInlineStartWidth?: $<string>
  borderInlineStyle?: $<string>
  borderInlineWidth?: $<string>
  borderLeft?: $<string>
  borderLeftColor?: $<string>
  borderLeftStyle?: $<string>
  borderLeftWidth?: $<string>
  borderRadius?: $<string>
  borderRight?: $<string>
  borderRightColor?: $<string>
  borderRightStyle?: $<string>
  borderRightWidth?: $<string>
  borderSpacing?: $<string>
  borderStartEndRadius?: $<string>
  borderStartStartRadius?: $<string>
  borderStyle?: $<string>
  borderTop?: $<string>
  borderTopColor?: $<string>
  borderTopLeftRadius?: $<string>
  borderTopRightRadius?: $<string>
  borderTopStyle?: $<string>
  borderTopWidth?: $<string>
  borderWidth?: $<string>
  bottom?: $<string>
  boxShadow?: $<string>
  boxSizing?: $<string>
  breakAfter?: $<string>
  breakBefore?: $<string>
  breakInside?: $<string>
  captionSide?: $<string>
  caretColor?: $<string>
  clear?: $<string>
  clipPath?: $<string>
  clipRule?: $<string>
  color?: $<string>
  colorInterpolation?: $<string>
  colorInterpolationFilters?: $<string>
  colorScheme?: $<string>
  columnCount?: $<string>
  columnFill?: $<string>
  columnGap?: $<string>
  columnRule?: $<string>
  columnRuleColor?: $<string>
  columnRuleStyle?: $<string>
  columnRuleWidth?: $<string>
  columnSpan?: $<string>
  columnWidth?: $<string>
  columns?: $<string>
  contain?: $<string>
  containIntrinsicBlockSize?: $<string>
  containIntrinsicHeight?: $<string>
  containIntrinsicInlineSize?: $<string>
  containIntrinsicSize?: $<string>
  containIntrinsicWidth?: $<string>
  container?: $<string>
  containerName?: $<string>
  containerType?: $<string>
  content?: $<string>
  contentVisibility?: $<string>
  counterIncrement?: $<string>
  counterReset?: $<string>
  counterSet?: $<string>
  cssFloat?: $<string>
  cssText?: $<string>
  cursor?: $<string>
  cx?: $<string>
  cy?: $<string>
  d?: $<string>
  direction?: $<string>
  display?: $<string>
  dominantBaseline?: $<string>
  emptyCells?: $<string>
  fill?: $<string>
  fillOpacity?: $<string>
  fillRule?: $<string>
  filter?: $<string>
  flex?: $<string>
  flexBasis?: $<string>
  flexDirection?: $<string>
  flexFlow?: $<string>
  flexGrow?: $<string>
  flexShrink?: $<string>
  flexWrap?: $<string>
  float?: $<string>
  floodColor?: $<string>
  floodOpacity?: $<string>
  font?: $<string>
  fontFamily?: $<string>
  fontFeatureSettings?: $<string>
  fontKerning?: $<string>
  fontOpticalSizing?: $<string>
  fontPalette?: $<string>
  fontSize?: $<string>
  fontSizeAdjust?: $<string>
  fontStretch?: $<string>
  fontStyle?: $<string>
  fontSynthesis?: $<string>
  fontSynthesisSmallCaps?: $<string>
  fontSynthesisStyle?: $<string>
  fontSynthesisWeight?: $<string>
  fontVariant?: $<string>
  fontVariantAlternates?: $<string>
  fontVariantCaps?: $<string>
  fontVariantEastAsian?: $<string>
  fontVariantLigatures?: $<string>
  fontVariantNumeric?: $<string>
  fontVariantPosition?: $<string>
  fontVariationSettings?: $<string>
  fontWeight?: $<string>
  forcedColorAdjust?: $<string>
  gap?: $<string>
  grid?: $<string>
  gridArea?: $<string>
  gridAutoColumns?: $<string>
  gridAutoFlow?: $<string>
  gridAutoRows?: $<string>
  gridColumn?: $<string>
  gridColumnEnd?: $<string>
  gridColumnGap?: $<string>
  gridColumnStart?: $<string>
  gridGap?: $<string>
  gridRow?: $<string>
  gridRowEnd?: $<string>
  gridRowGap?: $<string>
  gridRowStart?: $<string>
  gridTemplate?: $<string>
  gridTemplateAreas?: $<string>
  gridTemplateColumns?: $<string>
  gridTemplateRows?: $<string>
  height?: $<string>
  hyphenateCharacter?: $<string>
  hyphens?: $<string>
  imageRendering?: $<string>
  inlineSize?: $<string>
  inset?: $<string>
  insetBlock?: $<string>
  insetBlockEnd?: $<string>
  insetBlockStart?: $<string>
  insetInline?: $<string>
  insetInlineEnd?: $<string>
  insetInlineStart?: $<string>
  isolation?: $<string>
  justifyContent?: $<string>
  justifyItems?: $<string>
  justifySelf?: $<string>
  left?: $<string>
  letterSpacing?: $<string>
  lightingColor?: $<string>
  lineBreak?: $<string>
  lineHeight?: $<string>
  listStyle?: $<string>
  listStyleImage?: $<string>
  listStylePosition?: $<string>
  listStyleType?: $<string>
  margin?: $<string>
  marginBlock?: $<string>
  marginBlockEnd?: $<string>
  marginBlockStart?: $<string>
  marginBottom?: $<string>
  marginInline?: $<string>
  marginInlineEnd?: $<string>
  marginInlineStart?: $<string>
  marginLeft?: $<string>
  marginRight?: $<string>
  marginTop?: $<string>
  marker?: $<string>
  markerEnd?: $<string>
  markerMid?: $<string>
  markerStart?: $<string>
  mask?: $<string>
  maskClip?: $<string>
  maskComposite?: $<string>
  maskImage?: $<string>
  maskMode?: $<string>
  maskOrigin?: $<string>
  maskPosition?: $<string>
  maskRepeat?: $<string>
  maskSize?: $<string>
  maskType?: $<string>
  mathDepth?: $<string>
  mathStyle?: $<string>
  maxBlockSize?: $<string>
  maxHeight?: $<string>
  maxInlineSize?: $<string>
  maxWidth?: $<string>
  minBlockSize?: $<string>
  minHeight?: $<string>
  minInlineSize?: $<string>
  minWidth?: $<string>
  mixBlendMode?: $<string>
  objectFit?: $<string>
  objectPosition?: $<string>
  offset?: $<string>
  offsetAnchor?: $<string>
  offsetDistance?: $<string>
  offsetPath?: $<string>
  offsetPosition?: $<string>
  offsetRotate?: $<string>
  opacity?: $<string>
  order?: $<string>
  orphans?: $<string>
  outline?: $<string>
  outlineColor?: $<string>
  outlineOffset?: $<string>
  outlineStyle?: $<string>
  outlineWidth?: $<string>
  overflow?: $<string>
  overflowAnchor?: $<string>
  overflowClipMargin?: $<string>
  overflowWrap?: $<string>
  overflowX?: $<string>
  overflowY?: $<string>
  overscrollBehavior?: $<string>
  overscrollBehaviorBlock?: $<string>
  overscrollBehaviorInline?: $<string>
  overscrollBehaviorX?: $<string>
  overscrollBehaviorY?: $<string>
  padding?: $<string>
  paddingBlock?: $<string>
  paddingBlockEnd?: $<string>
  paddingBlockStart?: $<string>
  paddingBottom?: $<string>
  paddingInline?: $<string>
  paddingInlineEnd?: $<string>
  paddingInlineStart?: $<string>
  paddingLeft?: $<string>
  paddingRight?: $<string>
  paddingTop?: $<string>
  page?: $<string>
  pageBreakAfter?: $<string>
  pageBreakBefore?: $<string>
  pageBreakInside?: $<string>
  paintOrder?: $<string>
  perspective?: $<string>
  perspectiveOrigin?: $<string>
  placeContent?: $<string>
  placeItems?: $<string>
  placeSelf?: $<string>
  pointerEvents?: $<string>
  position?: $<string>
  printColorAdjust?: $<string>
  quotes?: $<string>
  r?: $<string>
  resize?: $<string>
  right?: $<string>
  rotate?: $<string>
  rowGap?: $<string>
  rubyPosition?: $<string>
  rx?: $<string>
  ry?: $<string>
  scale?: $<string>
  scrollBehavior?: $<string>
  scrollMargin?: $<string>
  scrollMarginBlock?: $<string>
  scrollMarginBlockEnd?: $<string>
  scrollMarginBlockStart?: $<string>
  scrollMarginBottom?: $<string>
  scrollMarginInline?: $<string>
  scrollMarginInlineEnd?: $<string>
  scrollMarginInlineStart?: $<string>
  scrollMarginLeft?: $<string>
  scrollMarginRight?: $<string>
  scrollMarginTop?: $<string>
  scrollPadding?: $<string>
  scrollPaddingBlock?: $<string>
  scrollPaddingBlockEnd?: $<string>
  scrollPaddingBlockStart?: $<string>
  scrollPaddingBottom?: $<string>
  scrollPaddingInline?: $<string>
  scrollPaddingInlineEnd?: $<string>
  scrollPaddingInlineStart?: $<string>
  scrollPaddingLeft?: $<string>
  scrollPaddingRight?: $<string>
  scrollPaddingTop?: $<string>
  scrollSnapAlign?: $<string>
  scrollSnapStop?: $<string>
  scrollSnapType?: $<string>
  scrollbarColor?: $<string>
  scrollbarGutter?: $<string>
  scrollbarWidth?: $<string>
  shapeImageThreshold?: $<string>
  shapeMargin?: $<string>
  shapeOutside?: $<string>
  shapeRendering?: $<string>
  stopColor?: $<string>
  stopOpacity?: $<string>
  stroke?: $<string>
  strokeDasharray?: $<string>
  strokeDashoffset?: $<string>
  strokeLinecap?: $<string>
  strokeLinejoin?: $<string>
  strokeMiterlimit?: $<string>
  strokeOpacity?: $<string>
  strokeWidth?: $<string>
  tabSize?: $<string>
  tableLayout?: $<string>
  textAlign?: $<string>
  textAlignLast?: $<string>
  textAnchor?: $<string>
  textCombineUpright?: $<string>
  textDecoration?: $<string>
  textDecorationColor?: $<string>
  textDecorationLine?: $<string>
  textDecorationSkipInk?: $<string>
  textDecorationStyle?: $<string>
  textDecorationThickness?: $<string>
  textEmphasis?: $<string>
  textEmphasisColor?: $<string>
  textEmphasisPosition?: $<string>
  textEmphasisStyle?: $<string>
  textIndent?: $<string>
  textOrientation?: $<string>
  textOverflow?: $<string>
  textRendering?: $<string>
  textShadow?: $<string>
  textTransform?: $<string>
  textUnderlineOffset?: $<string>
  textUnderlinePosition?: $<string>
  textWrap?: $<string>
  textWrapMode?: $<string>
  textWrapStyle?: $<string>
  top?: $<string>
  touchAction?: $<string>
  transform?: $<string>
  transformBox?: $<string>
  transformOrigin?: $<string>
  transformStyle?: $<string>
  transition?: $<string>
  transitionBehavior?: $<string>
  transitionDelay?: $<string>
  transitionDuration?: $<string>
  transitionProperty?: $<string>
  transitionTimingFunction?: $<string>
  translate?: $<string>
  unicodeBidi?: $<string>
  userSelect?: $<string>
  vectorEffect?: $<string>
  verticalAlign?: $<string>
  viewTransitionName?: $<string>
  visibility?: $<string>
  webkitTextFillColor?: $<string>
  webkitTextStroke?: $<string>
  webkitTextStrokeColor?: $<string>
  webkitTextStrokeWidth?: $<string>
  whiteSpace?: $<string>
  whiteSpaceCollapse?: $<string>
  widows?: $<string>
  width?: $<string>
  willChange?: $<string>
  wordBreak?: $<string>
  wordSpacing?: $<string>
  wordWrap?: $<string>
  writingMode?: $<string>
  x?: $<string>
  y?: $<string>
  zIndex?: $<string>
  zoom?: $<string>
}
interface PrefixedStyleAttributes {
  [rule: `style:${string}`]: $<string>
}
interface StandardAttributes {
  accessKey?: $<string>
  autoCapitalize?: $<AutoCapitalize>
  autoFocus?: $<boolean>
  class?: $<string>
  className?: $<string>
  contentEditable?: $<BooleanLike | "inherit" | "plaintext-only">
  contextMenu?: $<string>
  dir?: $<string>
  draggable?: $<boolean>
  enterKeyHint?: $<EnterKeyHint>
  hidden?: $<boolean>
  id?: $<string>
  lang?: $<string>
  nonce?: $<string>
  slot?: $<string>
  spellCheck?: $<boolean>
  style?: $<CSSProperties | string>
  tabIndex?: $<number>
  title?: $<string>
  translate?: $<"yes" | "no">
}
interface GlobalHTMLAttributes {
  accept?: $<string>
  acceptCharset?: $<string>
  allowFullscreen?: $<boolean>
  allowTransparency?: $<boolean>
  alt?: $<string>
  as?: $<string>
  async?: $<boolean>
  autoComplete?: $<string>
  autoPlay?: $<boolean>
  capture?: $<BooleanLike | "user" | "environment">
  cellPadding?: $<string | number>
  cellSpacing?: $<string | number>
  charSet?: $<string>
  challenge?: $<string>
  checked?: $<boolean>
  cite?: $<string>
  classID?: $<string>
  cols?: $<number | string>
  colSpan?: $<number | string>
  controls?: $<boolean>
  coords?: $<string>
  crossOrigin?: $<"anonymous" | "use-credentials" | "">
  data?: $<string>
  dateTime?: $<string>
  default?: $<boolean>
  defer?: $<boolean>
  disabled?: $<boolean>
  download?: any
  encType?: $<string>
  form?: $<string>
  formEncType?: $<string>
  formMethod?: $<string>
  formNoValidate?: $<boolean>
  formTarget?: $<string>
  frameBorder?: $<number>
  headers?: $<string>
  height?: $<number>
  high?: $<number>
  href?: $<string>
  hrefLang?: $<string>
  htmlFor?: $<string>
  httpEquiv?: $<string>
  integrity?: $<string>
  keyParams?: $<string>
  keyType?: $<string>
  kind?: $<string>
  label?: $<string>
  list?: $<string>
  loop?: $<boolean>
  low?: $<number>
  manifest?: $<string>
  marginHeight?: $<number>
  marginWidth?: $<number>
  max?: $<number>
  maxLength?: $<number>
  multiple?: $<boolean>
  muted?: $<boolean>
  name?: $<string>
  noValidate?: $<boolean>
  open?: $<boolean>
  optimum?: $<number>
  pattern?: $<string>
  placeholder?: $<string>
  playsInline?: $<boolean>
  poster?: $<string>
  preload?: $<string>
  readOnly?: $<boolean>
  required?: $<BooleanLike>
  referrerPolicy?: $<HTMLAttributeReferrerPolicy>
  reversed?: $<boolean>
  rows?: $<number>
  rowSpan?: $<number>
  sandbox?: $<string>
  scope?: $<string>
  scoped?: $<boolean>
  scrolling?: $<string>
  seamless?: $<boolean>
  selected?: $<boolean>
  shape?: $<string>
  size?: $<number>
  sizes?: $<string>
  span?: $<number>
  src?: $<string>
  srcDoc?: $<string>
  srcLang?: $<string>
  srcSet?: $<string>
  start?: $<number>
  step?: $<number | string>
  summary?: $<string>
  target?: $<HTMLAttributeAnchorTarget>
  type?: $<string>
  useMap?: $<string>
  value?: $<string | string[] | number>
  width?: $<number | string>
  wmode?: $<string>
  wrap?: $<string>
}
interface RDFaAttributes {
  about?: $<string>
  rel?: $<string>
  rev?: $<string>
  src?: $<string>
  href?: $<string>
  resource?: $<string>
  property?: $<string>
  content?: $<string>
  datatype?: $<string>
  inlist?: any
  prefix?: $<string>
  typeof?: $<string>
}
interface NonStandardAttributes {
  autoCorrect?: $<string>
  autoSave?: $<string>
  color?: $<string>
  itemProp?: $<string>
  itemScope?: $<boolean>
  itemType?: $<string>
  itemID?: $<string>
  itemRef?: $<string>
  results?: $<number>
  security?: $<string>
  unselectable?: $<"on" | "off">
}
