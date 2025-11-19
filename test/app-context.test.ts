import assert from "assert"
import { AppContext } from "../lib/template/app-context"
import { resourceName } from "../lib/template/common/common-utils"
import { BaseStack } from "../lib/template/stack/base/base-stack"
import {
  APP_CONFIG_FIXTURE_PATH,
  APP_CONFIG_FIXTURE_PATH_PATTERN,
  createAppConfigFixture,
} from "./fixtures/config/app-config-fixture"
import { createAppContextFixture } from "./fixtures/app-context-fixture"

describe("app-context", () => {
  test("should create app context from JSON object", () => {
    const config = createAppConfigFixture()
    const context = AppContext.fromConfig(config)
    expect(context).toBeInstanceOf(AppContext)
    expect(context.stageName).toBe("dev")
  })

  test("should create app context from JSON file specified by APP_CONFIG env variable", () => {
    process.env.APP_CONFIG = APP_CONFIG_FIXTURE_PATH
    process.env.STAGE = "invalid"
    process.env.DEFAULT_STAGE = "invalid"
    const context = new AppContext({ enableOutput: false })
    expect(context).toBeInstanceOf(AppContext)
    expect(context.stageName).toBe("dev")
  })

  test("should create app context based on STAGE env variable", () => {
    process.env.APP_CONFIG = ""
    process.env.STAGE = "dev"
    process.env.DEFAULT_STAGE = "invalid"
    const context = new AppContext({
      appConfigFilePattern: APP_CONFIG_FIXTURE_PATH_PATTERN,
      enableOutput: false,
    })
    expect(context).toBeInstanceOf(AppContext)
    expect(context.stageName).toBe("dev")
  })

  test("should create app context based on DEFAULT_STAGE env variable", () => {
    process.env.APP_CONFIG = ""
    process.env.STAGE = ""
    process.env.DEFAULT_STAGE = "dev"
    const context = new AppContext({
      appConfigFilePattern: APP_CONFIG_FIXTURE_PATH_PATTERN,
      enableOutput: false,
    })
    expect(context).toBeInstanceOf(AppContext)
    expect(context.stageName).toBe("dev")
  })

  test("should fail for no stage", () => {
    process.env.APP_CONFIG = ""
    process.env.STAGE = ""
    process.env.DEFAULT_STAGE = ""
    expect(
      () =>
        new AppContext({
          appConfigFilePattern: APP_CONFIG_FIXTURE_PATH_PATTERN,
          enableOutput: false,
        })
    ).toThrowError("Failed to find App-Config json file")
  })

  test("should fail for invalid", () => {
    process.env.APP_CONFIG = ""
    process.env.STAGE = "invalid"
    process.env.DEFAULT_STAGE = ""
    expect(
      () =>
        new AppContext({
          appConfigFilePattern: APP_CONFIG_FIXTURE_PATH_PATTERN,
          enableOutput: false,
        })
    ).toThrowError("no such file or directory")
  })

  it("Default configVersion should be 1", () => {
    const config = createAppConfigFixture()
    const context = AppContext.fromConfig(config)
    expect(context).toBeInstanceOf(AppContext)
    expect(context).toHaveProperty("configVersion", "1")
  })

  it("Should set configVersion", () => {
    const config = createAppConfigFixture({ configVersion: "2" })
    const context = AppContext.fromConfig(config)
    expect(context).toBeInstanceOf(AppContext)
    expect(context).toHaveProperty("configVersion", "2")
  })

  it("Should expose configured project regions", () => {
    const context = createAppContextFixture()
    expect(context.primaryRegion).toBe("eu-central-1")
    expect(context.projectRegions).toEqual(["eu-central-1", "eu-west-1"])
    expect(context.env.region).toBe("eu-central-1")
    expect(context.appConfig.project.region).toBe("eu-central-1")
  })

  it("Config Version 1 should have muted function type for resource names and versioning info", () => {
    const config = createAppConfigFixture()
    const context = AppContext.fromConfig(config)
    const stack = BaseStack.fromAppContext(context, "stack1")
    assert(stack, "Cannot create stack") // To avoid TS type check issue for the next line
    expect(resourceName(stack, "test", "function")).toBe(
      "example-project-stack1-v1-dev-test"
    )
  })

  it("Config Version 2 should have muted function type for resource names and versioning info", () => {
    const config = createAppConfigFixture({ configVersion: "2" })
    const context = AppContext.fromConfig(config)
    const stack = BaseStack.fromAppContext(context, "stack1")
    assert(stack, "Cannot create stack") // To avoid TS type check issue for the next line
    expect(resourceName(stack, "test", "function")).toBe(
      "example-project-stack1-dev-test-function"
    )
  })

  it("Should replace env vars in config", () => {
    const config = createAppConfigFixture()
    process.env.VARNAME = "dev"
    const context = AppContext.fromConfig({
      ...config,
      global: { someValue: "test/${VARNAME}" },
    })
    expect(context).toBeInstanceOf(AppContext)
    expect(context.appConfig.global.someValue).toBe("test/dev")
  })

  it("Should rename stacks with project name, version and stage", () => {
    const context = createAppContextFixture()
    expect(context.appConfig.stacks.stack1.name).toBe(
      "example-project-stack1-v1-dev"
    )
    expect(context.appConfig.stacks.stack1.shortStackName).toBe("stack1")
  })

  it("Should rename stacks with project and stage for config version 2", () => {
    const config = createAppConfigFixture({ configVersion: "2" })
    const context = AppContext.fromConfig(config)
    expect(context.appConfig.stacks.stack1.name).toBe(
      "example-project-stack1-dev"
    )
    expect(context.appConfig.stacks.stack1.shortStackName).toBe("stack1")
  })

  it("Should throw for invalid configVersion", () => {
    const appConfig = createAppConfigFixture({ configVersion: "3" })
    expect(
      () => new AppContext({ appConfig, enableOutput: false })
    ).toThrowError("Invalid config version")
  })
})
