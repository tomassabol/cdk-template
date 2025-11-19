import { deepMerge } from "../../lib/template/utils/deep-merge"

describe("deep-merge", () => {
  test("deepMerge", () => {
    expect(deepMerge({})).toEqual({})
    expect(deepMerge({ a: 1 })).toEqual({ a: 1 })
    expect(deepMerge([1])).toEqual([1])
    expect(deepMerge("a", "b")).toEqual("b")
    expect(deepMerge("value")).toEqual("value")
    expect(deepMerge({}, [1])).toEqual([1])
    expect(deepMerge([], [1, 2])).toEqual([1, 2])
    expect(deepMerge([1], [1, 2])).toEqual([1, 2])
    expect(deepMerge([1, 2], [1])).toEqual([1, 2])
    expect(deepMerge([1, 2], [2, 3])).toEqual([1, 2, 3])
    expect(deepMerge({ a: [1, 2] }, { a: [2, 3] })).toEqual({ a: [1, 2, 3] })
    expect(deepMerge({ a: [1, 2] }, { a: "text", b: { c: 1 } })).toEqual({
      a: "text",
      b: { c: 1 },
    })
    expect(deepMerge({ a: { b: 1 } }, { a: { c: 2 } })).toEqual({
      a: { b: 1, c: 2 },
    })
  })
})
