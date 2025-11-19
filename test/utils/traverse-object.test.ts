import { traverseObject } from "../../lib/template/utils/traverse-object"

describe("traverse-object", () => {
  test("should reach all properties", () => {
    const obj = { a: { b: 1, c: 2, d: null }, e: 3 }
    const callback = jest.fn()
    expect(traverseObject(obj, callback)).toBeUndefined()
    expect(callback.mock.calls).toMatchSnapshot()
  })

  test("should not fail for null", () => {
    const callback = jest.fn()
    expect(traverseObject(null, callback)).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
  })

  test("should not fail for a string", () => {
    const callback = jest.fn()
    expect(traverseObject("test", callback)).toBeUndefined()
    expect(callback).not.toHaveBeenCalled()
  })
})
