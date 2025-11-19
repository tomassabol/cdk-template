import { Template } from "aws-cdk-lib/assertions"
import { NodeJsFunctionSimplePattern } from "../../lib/template/construct/pattern/nodejs-function-simple-pattern/nodejs-function-simple-pattern"
import { createBaseStackFixture } from "../fixtures/base-stack-fixture"

describe("nodejs-function-simple-pattern", () => {
  test("NodeJsFunctionSimplePatternProps", () => {
    const stack = createBaseStackFixture()

    new NodeJsFunctionSimplePattern(stack, "test", {
      entry: "test/fixtures/lambda/example-function.ts",
      powertoolsLayer: false,
    })

    const template = Template.fromStack(stack)

    template.hasResource("AWS::Lambda::Function", {
      Properties: { FunctionName: "example-project-stack1-v1-dev-test" },
    })

    const props = getSingleResourceProps(
      template.findResources("AWS::Lambda::Function", {
        Properties: { FunctionName: "example-project-stack1-v1-dev-test" },
      })
    )
    expect(props).not.toHaveProperty("Layers")
  })

  test("powertoolsLayer", () => {
    const stack = createBaseStackFixture()

    new NodeJsFunctionSimplePattern(stack, "test", {
      entry: "test/fixtures/lambda/example-function.ts",
      powertoolsLayer: true,
    })

    const template = Template.fromStack(stack)

    template.hasResource("AWS::Lambda::Function", {
      Properties: { FunctionName: "example-project-stack1-v1-dev-test" },
    })

    const props = getSingleResourceProps(
      template.findResources("AWS::Lambda::Function", {
        Properties: { FunctionName: "example-project-stack1-v1-dev-test" },
      })
    )
    expect(props.Layers).toHaveLength(1)
  })
})

function getSingleResourceProps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resources: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const keys = Object.keys(resources)
  expect(keys.length).toBe(1)
  return resources[keys[0]].Properties
}
