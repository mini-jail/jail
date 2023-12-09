declare global {
  namespace space {
    interface ForProps {
      each: ComponentProps[] | (() => ComponentProps[])
      do: Component<ComponentProps>
    }
    interface Components {
      For: Component<ForProps>
    }
  }
}

export {}
