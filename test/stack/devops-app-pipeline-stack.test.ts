import { Template } from "aws-cdk-lib/assertions"
import { createAppContextFixture } from "../fixtures/app-context-fixture"
import { DevopsAppPipelineStack } from "../../lib"

describe("devops-app-pipeline-stack", () => {
  const stackConfig = {
    name: "example",
    repositoryOwner: "owner",
    repositoryName: "repo-name",
    codestarConnectionArn: "arn",
  }

  test("Create stack production environment", () => {
    const appContext = createAppContextFixture({ stage: "prod" })

    const stack = new DevopsAppPipelineStack(appContext, stackConfig)

    const template = Template.fromStack(stack)

    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1)
    template.resourceCountIs("AWS::CodeBuild::Project", 2)
  })

  test("Create stack non-production environment", () => {
    const appContext = createAppContextFixture()

    const stack = new DevopsAppPipelineStack(appContext, stackConfig)

    const template = Template.fromStack(stack)

    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1)
    template.resourceCountIs("AWS::CodeBuild::Project", 2)
  })

  test("Disable all optional steps", () => {
    const appContext = createAppContextFixture()

    const stack = new DevopsAppPipelineStack(appContext, stackConfig, {
      integrationTest: { enabled: false },
      slackNotif: { enabled: false },
    })

    const template = Template.fromStack(stack)

    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1)
    template.resourceCountIs("AWS::CodeBuild::Project", 1)
  })

  test("Enable all optional steps", () => {
    const appContext = createAppContextFixture()

    const stack = new DevopsAppPipelineStack(appContext, stackConfig, {
      deploy: { enabled: true },
      integrationTest: { enabled: true },
    })

    const template = Template.fromStack(stack)

    template.resourceCountIs("AWS::CodePipeline::Pipeline", 1)
    template.resourceCountIs("AWS::CodeBuild::Project", 2)
  })
})
