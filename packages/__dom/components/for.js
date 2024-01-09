/**
 * @param {{ children?: any, each: Iterable<any>, do: (item: any) => any }} props
 */
export function For(props) {
  return function* () {
    yield props.children
    for (const item of props.each) {
      yield props.do(item)
    }
  }
}
