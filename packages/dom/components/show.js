/**
 * @param {space.ShowProps} props
 */
export function Show(props) {
  return () => props.when + "" === "true" ? props.children : props.fallback
}
