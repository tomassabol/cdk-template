import assert from "assert"
import { Template } from "aws-cdk-lib/assertions"
import { AppContext, BaseConstruct, BaseStack, StackConfig } from "../../lib"
import { createAppContextFixture } from "../fixtures/app-context-fixture"

describe("base-stack", () => {
  test("Warmed lambda functions should create multiple CloudWatch Event rules", () => {
    const appContext = createAppContextFixture()
    const stackConfig = { name: "example" }
    const numberOfLambdas = 25
    const expectedNumberOfRules = Math.ceil(numberOfLambdas / 5)

    const stack = new ExampleStack(appContext, stackConfig, numberOfLambdas)

    const template = Template.fromStack(stack)

    template.resourcePropertiesCountIs(
      "AWS::Events::Rule",
      {},
      expectedNumberOfRules
    )
  })

  test("baseStack.createResourceName", () => {
    const appContext = createAppContextFixture()

    const stackConfig = { name: "example" }
    const stack = new BaseStack(appContext, stackConfig)
    expect(stack.createResourceName("test")).toBe("example-test")
    expect(stack.createResourceName("test", "function")).toBe("example-test")
    expect(stack.createResourceName("test", "table")).toBe("example-test-table")
    expect(
      stack.createResourceName({ baseName: "test", resourceType: "function" })
    ).toBe("example-test")
    expect(
      stack.createResourceName({ baseName: "test", resourceType: "table" })
    ).toBe("example-test-table")
  })

  test("baseConstruct.createResourceName", () => {
    const appContext = createAppContextFixture()

    const stackConfig = { name: "example" }
    const stack = new BaseStack(appContext, stackConfig)
    const construct = new BaseConstruct(stack, "construct")
    expect(construct.createResourceName("test")).toBe("example-test")
    expect(construct.createResourceName("test", "function")).toBe(
      "example-test"
    )
    expect(construct.createResourceName("test", "table")).toBe(
      "example-test-table"
    )
    expect(
      construct.createResourceName({
        baseName: "test",
        resourceType: "function",
      })
    ).toBe("example-test")
    expect(
      construct.createResourceName({ baseName: "test", resourceType: "table" })
    ).toBe("example-test-table")
  })

  test("fromAppConfig", () => {
    const appContext = createAppContextFixture()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appContextExposed = appContext as any
    appContextExposed.appConfig = {
      stacks: { example: { name: "example" } },
    }
    const stack = ExampleStack.fromAppContext(appContext, "example", 1)

    expect(stack).toBeDefined()
    assert(stack)

    const template = Template.fromStack(stack)
    template.resourcePropertiesCountIs("AWS::Events::Rule", {}, 1)
  })

  test("fromAppConfig non-existing stack", () => {
    const appContext = createAppContextFixture()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appContextExposed = appContext as any
    appContextExposed.appConfig = {
      stacks: { other: { name: "other" } },
    }
    const stack = ExampleStack.fromAppContext(appContext, "example", 1)

    expect(stack).toBeNull()
  })
})

class ExampleStack extends BaseStack {
  constructor(
    appContext: AppContext,
    stackConfig: StackConfig,
    numberOfLambdas: number
  ) {
    super(appContext, stackConfig)

    for (let i = 0; i < numberOfLambdas; ++i) {
      this.createNodeJsFunction("test" + i.toString(), {
        warmUp: true,
        entry: "test/fixtures/lambda/example-function.ts",
      })
    }
  }
}
