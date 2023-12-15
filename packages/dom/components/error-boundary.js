/**
 * @param {space.ErrorBoundaryProps} props
 */
export function ErrorBoundary(props) {
  return function () {
    try {
      return props.children
    } catch (error) {
      props.onError?.(error)
      return props.fallback
    }
  }
}
