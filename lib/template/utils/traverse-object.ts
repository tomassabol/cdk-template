/**
 * Traverse object
 */

import { hasOwn } from "./hasOwn"

/**
 * Traverse all properties of an object
 */
export function traverseObject(
  obj: unknown,
  callback: (key: string, value: unknown, obj: Record<string, unknown>) => void
) {
  if (obj !== null && typeof obj === "object") {
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        const value = obj[key]

        if (typeof value === "object" && value !== null) {
          // Recursive call for nested objects
          traverseObject(value, callback)
        } else {
          callback(key, value, obj)
        }
      }
    }
  }
}
