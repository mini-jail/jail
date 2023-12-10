/**
 * @param {space.ForProps} props
 * @returns {space.ReadOnlySignal<space.Slot>}
 */
export function For(props) {
  return function* () {
    yield props.children
    for (const item of props.each) {
      yield props.do(item)
    }
  }
}
