/**
 * @param {{ children: (item: any) => any, each: Iterable<any> }} props
 */
export function* For(props) {
  for (const item of props.each) {
    yield props.children(item)
  }
}
