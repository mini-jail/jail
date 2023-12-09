declare global {
  namespace space {
    type RenderResult = DOMChildNode | DOMChildNode[] | undefined
    interface DOMDocumentFragment extends globalThis.DocumentFragment {
      childNodes: NodeListOf<DOMChildNode>
      cloneNode(deep?: boolean): DOMDocumentFragment
      querySelectorAll(selectors: string): NodeListOf<DOMElement>
    }
    interface DOMElement {
      getAttribute(name: Template["hash"]): string
    }
  }
}

export {}
