import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import {
  defaultBucketProps,
  defaultFunctionProps,
  defaultQueueProps,
  defaultTableProps,
  defaultTopicProps,
  withDefaultBucketProps,
  withDefaultFunctionProps,
  withDefaultQueueProps,
  withDefaultTableProps,
  withDefaultTopicProps,
} from "../../lib"
import { createBaseStackFixture } from "../fixtures/base-stack-fixture"

describe("default-props", () => {
  test("defaultBucketProps", () => {
    const stack = createBaseStackFixture()
    expect(defaultBucketProps(stack, "id")).toBeInstanceOf(Object)
  })

  test("withDefaultBucketProps", () => {
    const stack = createBaseStackFixture()
    expect(withDefaultBucketProps(stack, "id")).toHaveLength(3)
  })

  test("defaultFunctionProps", () => {
    const stack = createBaseStackFixture()
    expect(
      defaultFunctionProps(stack, "id", { entry: "src/function.ts" })
    ).toBeInstanceOf(Object)
  })

  test("withDefaultFunctionProps", () => {
    const stack = createBaseStackFixture()
    expect(
      withDefaultFunctionProps(stack, "id", { entry: "src/function.ts" })
    ).toHaveLength(3)
  })

  test("defaultQueueProps", () => {
    const stack = createBaseStackFixture()
    expect(defaultQueueProps(stack, "id")).toBeInstanceOf(Object)
  })

  test("withDefaultQueueProps", () => {
    const stack = createBaseStackFixture()
    expect(withDefaultQueueProps(stack, "id")).toHaveLength(3)
  })

  test("defaultTableProps", () => {
    const stack = createBaseStackFixture()
    expect(
      defaultTableProps(stack, "id", {
        partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      })
    ).toBeInstanceOf(Object)
  })

  test("withDefaultTableProps", () => {
    const stack = createBaseStackFixture()
    expect(
      withDefaultTableProps(stack, "id", {
        partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      })
    ).toHaveLength(3)
  })

  test("defaultTopicProps", () => {
    const stack = createBaseStackFixture()
    expect(defaultTopicProps(stack, "id")).toBeInstanceOf(Object)
  })

  test("withDefaultTopicProps", () => {
    const stack = createBaseStackFixture()
    expect(withDefaultTopicProps(stack, "id")).toHaveLength(3)
  })
})
