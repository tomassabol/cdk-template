import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import {
  baseStackOf,
  resourceName,
  stageOf,
} from "../../lib/template/common/common-utils"
import { createBaseStackFixture } from "../fixtures/base-stack-fixture"
import { BaseConstruct } from "../../lib/template/construct/base/base-construct"

describe("common-utils", () => {
  describe("baseStackOf", () => {
    it("should get base stack for stack", () => {
      const stack = createBaseStackFixture()
      expect(baseStackOf(stack)).toBe(stack)
    })

    it("should get base stack for construct", () => {
      const stack = createBaseStackFixture()
      const construct = new Construct(stack, "ExampleConstruct")
      expect(baseStackOf(construct)).toBe(stack)
    })

    it("should get base stack for base construct", () => {
      const stack = createBaseStackFixture()
      const construct = new BaseConstruct(stack, "ExampleConstruct")
      expect(baseStackOf(construct)).toBe(stack)
    })

    it("should throw error for stack not derived from base stack", () => {
      const app = new cdk.App()
      const stack = new cdk.Stack(app, "ExampleStack")
      expect(() => baseStackOf(stack)).toThrowError(
        "Stack ExampleStack in not a BaseStack"
      )
    })

    it("should throw error for construct which is not child of base stack", () => {
      const app = new cdk.App()
      const stack = new cdk.Stack(app, "ExampleStack")
      const construct = new Construct(stack, "ExampleConstruct")
      expect(() => baseStackOf(construct)).toThrowError(
        "Construct ExampleStack/ExampleConstruct is is not a child of a BaseStack"
      )
    })

    it("should throw error for invalid parameter", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => baseStackOf(null as any)).toThrowError(
        "Invalid parameter of baseStackOf: expected stack or construct"
      )
    })
  })

  describe("stageOf", () => {
    it("should return stage name", () => {
      const stack = createBaseStackFixture()
      expect(stageOf(stack)).toBe("dev")
    })
  })

  describe("resourceName", () => {
    it("should return a resource name", () => {
      const stack = createBaseStackFixture()
      expect(resourceName(stack, "some", "table")).toBe(
        "example-project-stack1-v1-dev-some-table"
      )
    })

    it("should not add type if is is contained in name", () => {
      const stack = createBaseStackFixture()
      expect(resourceName(stack, "some-table", "table")).toBe(
        "example-project-stack1-v1-dev-some-table"
      )
    })
  })
})
