import { Template } from "aws-cdk-lib/assertions"
import { createAppContextFixture } from "../fixtures/app-context-fixture"
import { DevopsConfigPipelineStack } from "../../lib"

describe("devops-config-pipeline-stack", () => {
  const stackConfig = {
    name: "example",
    configRepositoryOwner: "owner",
    configRepositoryName: "repo-name",
    configCodestarConnectionArn: "arn",
  }

  test("Create stack", () => {
    const appContext = createAppContextFixture()

    const stack = new DevopsConfigPipelineStack(appContext, stackConfig)

    const template = Template.fromStack(stack)

    template.resourceCountIs("AWS::AppConfig::Application", 1)
    template.resourceCountIs("AWS::AppConfig::Environment", 1)
    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1)
  })
})
