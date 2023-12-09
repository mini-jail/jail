// deno-lint-ignore-file no-explicit-any
declare global {
  namespace space {
    type ComponentDataProps = Record<string, string | number | true>
    type ComponentData = {
      readonly slot: number
      readonly props: ComponentDataProps
      readonly selfClosing: boolean
    }
    type TemplateData = {
      [element: number | string]: number | ComponentData | AttributeData[]
    }
    type Template = {
      readonly fragment: DocumentFragment
      readonly templateString: string
      readonly hash: string
      readonly data: TemplateData
    }
    type AttributeData = {
      readonly namespace: string | null
      readonly name: string | number
      readonly value: string | number | null
      readonly slots: number[] | null
      readonly isStatic: boolean
    }
    interface SlotFunction {
      (this: any, event: Event<Element>, argument: any): any
    }
    interface SlotObject {
      [key: string | number | symbol]: any
    }
    type Slot =
      | string
      | number
      | boolean
      | null
      | undefined
      | void
      | Node
      | SlotFunction
      | SlotObject
      | Iterable<Slot>
    type ComponentGroups = {
      nameSlot: string
      attributes: string
    }
    type ComponentPropsGroups = {
      name: string
      slot1: string | undefined
      slot2: string | undefined
      slot3: string | undefined
      value1: string | undefined
      value2: string | undefined
      value3: string | undefined
    }
    type AttributeGroups = {
      namespace: string | undefined
      name: string
      nameSlot: string | undefined
      slot1: string | undefined
      slot2: string | undefined
      slot3: string | undefined
      value1: string | undefined
      value2: string | undefined
      value3: string | undefined
    }
    interface HTMLTemplateElement extends globalThis.HTMLTemplateElement {
      content: DocumentFragment
    }
  }
}

export {}
