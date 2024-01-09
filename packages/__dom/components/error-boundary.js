/**
 * @param {{ children?: any, onError?(error: any): void, fallback?: any }} props
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
