/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */

export function deepMerge<T>(target: T): T
export function deepMerge<T, U>(target: T, source: U): T & U
export function deepMerge<T, U, V>(target: T, source1: U, source2: V): T & U & V
export function deepMerge<T, U, V, W>(
  target: T,
  source1: U,
  source2: V,
  source3: W
): T & U & V & W
export function deepMerge(target: object, ...sources: any[]): any {
  if (!sources.length) return target
  const source = sources.shift()

  if (source === target) return target

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      // eslint-disable-next-line no-param-reassign
      ;(target as any)[key] = Object.prototype.hasOwnProperty.call(target, key)
        ? deepMerge((target as any)[key], source[key])
        : source[key]
    }
  } else if (Array.isArray(target) && Array.isArray(source)) {
    source.forEach((item) => {
      if (target.indexOf(item) === -1) {
        target.push(item)
      }
    })
  } else {
    return deepMerge(source, ...(sources as [any]))
  }

  return deepMerge(target, ...(sources as [any]))
}

function isObject(item: unknown): boolean {
  return item !== null && typeof item === "object" && !Array.isArray(item)
}
