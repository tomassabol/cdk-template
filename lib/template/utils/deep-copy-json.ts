/**
 * Simple deep copy for a JSON serializable object
 */

export function deepCopyJSON<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}
