/**
 * @param {space.ShowProps} props
 */
export function Show(props) {
  return function () {
    if (props.when + "" === "true") {
      return props.children
    }
    return props.fallback
  }
}
