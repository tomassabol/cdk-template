export function hasOwn<K extends string, T = unknown>(
  obj: unknown,
  key: K
): obj is { [key in K]: T } {
  return Object.prototype.hasOwnProperty.call(obj, key)
}
