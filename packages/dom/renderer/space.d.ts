declare global {
  namespace space {
    type RenderResult = ChildNode | ChildNode[] | undefined
    interface DocumentFragment extends globalThis.DocumentFragment {
      childNodes: NodeListOf<ChildNode>
      cloneNode(deep?: boolean): DocumentFragment
      querySelectorAll(selectors: string): NodeListOf<Element>
    }
    interface Element {
      getAttribute(name: Template["hash"]): string
    }
  }
}

export {}
