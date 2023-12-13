declare global {
  namespace space {
    type RenderResult = globalThis.Node | globalThis.Node[] | undefined
    interface DocumentFragment extends globalThis.DocumentFragment {
      childNodes: NodeListOf<Element>
      cloneNode(deep?: boolean): DocumentFragment
      querySelectorAll(selectors: string): NodeListOf<TemplateElement>
    }
    interface Element {
      getAttribute(name: Template["hash"]): string
    }
  }
}

export {}
