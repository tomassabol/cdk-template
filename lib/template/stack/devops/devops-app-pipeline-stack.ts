import * as cdk from "aws-cdk-lib"
import { StackConfig } from "../../app-config"
import { AppContext } from "../../app-context"
import { BaseStack } from "../base/base-stack"
import {
  PipelineSimplePattern,
  ActionKind,
  CustomPackage,
} from "../../construct/pattern"
import { deepMerge } from "../../utils/deep-merge"

type StageOptions = {
  enabled?: boolean
  additionalBuildCommands?: string[]
  installPackages?: CustomPackage[]
}

export type DevopsAppPipelineStackProps = cdk.StackProps & {
  deploy?: StageOptions
  integrationTest?: StageOptions
  slackNotif?: Pick<StageOptions, "enabled">
}

/**
 * Devops stack for application deployment pipeline.
 * Repository configuration is loaded from stack configuration parameters.
 *
 * Default props:
 *
 * - deploy.enabled: true
 * - slackNotif.enabled: true
 * - integrationTests.enabled: true
 *
 * @example
 *
 * ```ts
 * const appContext = new AppContext()
 * const pipeline = DevopsAppPipelineStack.from(appContext, "devops-app-pipeline")
 * ```
 */

export class DevopsAppPipelineStack extends BaseStack {
  /**
   * Default properties
   */

  public static readonly defaultProps: DevopsAppPipelineStackProps = {
    deploy: { enabled: true },
    integrationTest: { enabled: true },
    slackNotif: { enabled: true },
  }

  constructor(
    appContext: AppContext,
    stackConfig: StackConfig,
    props: DevopsAppPipelineStackProps = {}
  ) {
    super(appContext, stackConfig, {
      description: `Deployment pipeline for ${appContext.projectName} - stage ${appContext.stageName}`,
      ...props,
    })

    // eslint-disable-next-line no-param-reassign
    props = deepMerge({}, DevopsAppPipelineStack.defaultProps, props)

    const stages = this.getPipelineStages(props)

    const actionFlow =
      this.stageName === "prod"
        ? // Production pipeline flow
          [
            { stage: stages.source, enable: true },
            { stage: stages.deploy, enable: props.deploy?.enabled },
            { stage: stages.slackNotif, enable: props.slackNotif?.enabled },
          ]
            .filter(({ enable }) => enable)
            .map(({ stage }) => stage)
        : // Non-production pipeline flow
          [
            { stage: stages.source, enable: true },
            { stage: stages.deploy, enable: props.deploy?.enabled },
            {
              stage: stages.integrationTest,
              enable: props.integrationTest?.enabled,
            },
          ]
            .filter(({ enable }) => enable)
            .map(({ stage }) => stage)

    new PipelineSimplePattern(this, "app", { actionFlow })
  }

  /**
   * Export NPM token from AWS SSM
   * @returns Command to export NPM token from AWS SSM
   */
  private static exportNpmToken() {
    return "export NPM_TOKEN=`aws ssm get-parameter --name /npm/token --query Parameter.Value --output text --with-decryption`"
  }

  /**
   * Build properties for all pipeline stages
   * @param props Pipeline stack properties
   */
  private getPipelineStages(props: DevopsAppPipelineStackProps) {
    return {
      source: this.createSourceStep(),
      deploy: this.createDeployStep(props),
      integrationTest: this.createIntegrationTestStep(props),
      slackNotif: this.createSlackNotifStep(),
    }
  }

  /**
   * Create source step
   * @returns Source step
   */
  private createSourceStep() {
    const repository = this.getRepositoryParams()

    return {
      stage: "Source",
      kind: ActionKind.SourceCodeStarConnection,
      name: "Source",
      detail: {
        repositoryName: repository.repositoryName,
        repositoryOwner: repository.repositoryOwner,
        repositoryBranch: repository.repositoryBranch,
        connectionArn: repository.connectionArn,
      },
    }
  }

  /**
   * Create deploy step
   * @param props Pipeline stack properties
   * @returns Deploy step
   */
  private createDeployStep(props: DevopsAppPipelineStackProps) {
    const artifacts = this.getArtifactsProps()

    return {
      stage: "Deploy",
      kind: ActionKind.BuildCodeBuild,
      name: "Deploy",
      detail: {
        description: "Deploy AWS resources",
        appConfigFile: `infra/config/app-config-${this.stageName}.json`,
        buildCommands: [
          DevopsAppPipelineStack.exportNpmToken(),
          "npm install --global aws-cdk",
          "npm ci",
          ...(props.deploy?.additionalBuildCommands || []),
          "cdk deploy --all --require-approval=never --outputs-file .cdk-outputs.json",
        ],
        installPackages: props.deploy?.installPackages || [],
        // Export stack outputs
        exportArtifacts: artifacts.cdkOutputs.exportArtifacts,
      },
    }
  }

  /**
   * Create integration test step
   * @param props
   * @returns Integration test step
   */
  private createIntegrationTestStep(props: DevopsAppPipelineStackProps) {
    const artifacts = this.getArtifactsProps()

    return {
      stage: "Integration-Test",
      kind: ActionKind.BuildCodeBuild,
      name: "Integration-Test",
      detail: {
        description: "Run integration tests",
        appConfigFile: `infra/config/app-config-${this.stageName}.json`,
        buildCommands: [
          DevopsAppPipelineStack.exportNpmToken(),
          "export AWS_XRAY_CONTEXT_MISSING=IGNORE_ERROR",
          "npm ci",
          ...(props.integrationTest?.additionalBuildCommands || []),
          "npm run test-integration",
        ],
        installPackages: props.integrationTest?.installPackages || [],
        // Import stack outputs
        importArtifacts: artifacts.cdkOutputs.importArtifacts,
      },
    }
  }

  /**
   * Create Slack notification step
   * @returns Slack notification step
   */
  private createSlackNotifStep() {
    return {
      stage: "Slack-Notif",
      kind: ActionKind.BuildCodeBuild,
      name: "Slack-Notif",
      description: "Send Slack notification",
      detail: {
        appConfigFile: `infra/config/app-config-${this.stageName}.json`, // App config file to be used when deploying
        buildCommands: DevopsAppPipelineStack.sendSlackNotificationCmd(),
      },
    }
  }

  /**
   * Build commands for sending Slack notification
   * @returns Command to send Slack notification
   */
  private static sendSlackNotificationCmd() {
    return [
      'echo "Slack notification stage placeholder - configure sendSlackNotificationCmd() with real commands"',
    ]
    // return [
    //   `export PACKAGE_NAME=$(node -p -e "require('./package.json').name")`,
    //   `export PACKAGE_VERSION=$(node -p -e "require('./package.json').version")`,

    //   `curl -X POST \
    //         -H 'Content-type: application/json; charset=utf-8' \
    //         --data-binary '{ "channel": "#serverless-core-team", "username": "Release", "icon_emoji": ":rocket:", "text": "*'$PACKAGE_NAME'* \`v'$PACKAGE_VERSION'\` (<https://bitbucket.org/tomassaboldev/'$PACKAGE_NAME'/src/prod/CHANGELOG.md|changelog>)" }' \
    //         https://hooks.slack.com/services/url`,

    //   `curl -X POST \
    //         -H 'Content-type: application/json; charset=utf-8' \
    //         --data-binary '{ "channel": "#wms-team", "username": "Release", "icon_emoji": ":rocket:", "text": "*'$PACKAGE_NAME'* \`v'$PACKAGE_VERSION'\` (<https://bitbucket.org/tomassaboldev/'$PACKAGE_NAME'/src/prod/CHANGELOG.md|changelog>)" }' \
    //         https://hooks.slack.com/services/url`,

    //   `curl -X POST \
    //         -H 'Content-type: application/json; charset=utf-8' \
    //         --data-binary '{ "channel": "#log-it", "username": "Release", "icon_emoji": ":rocket:", "text": "*'$PACKAGE_NAME'* \`v'$PACKAGE_VERSION'\` (<https://bitbucket.org/tomassaboldev/'$PACKAGE_NAME'/src/prod/CHANGELOG.md|changelog>)" }' \
    //         https://hooks.slack.com/services/url`,
    // ]
  }

  /**
   * Get repository parameters from AppConfig stack parameters
   */

  private getRepositoryParams(): {
    connectionArn: string
    repositoryOwner: string
    repositoryName: string
    repositoryBranch: string
  } {
    return {
      connectionArn: this.getStackConfigParameter({
        name: "codestarConnectionArn",
        type: "string",
        required: true,
      }),
      repositoryOwner: this.getStackConfigParameter({
        name: "repositoryOwner",
        type: "string",
        required: true,
      }),
      repositoryName: this.getStackConfigParameter({
        name: "repositoryName",
        type: "string",
        required: true,
      }),
      repositoryBranch: this.getStackConfigParameter({
        name: "repositoryBranch",
        type: "string",
        defaultValue: this.stageName,
      }),
    }
  }

  /**
   * Get properties for building artifact exports and imports between pipeline stages
   */

  private getArtifactsProps() {
    return {
      /**
       * Shared artifacts for CDK stack outputs
       */

      cdkOutputs: {
        exportArtifacts: {
          name: "CdkOutputs",
          files: [".cdk-outputs.json"],
        },
        importArtifacts: [
          {
            name: "CdkOutputs",
            copyArtifacts: [
              {
                fromArtifactPath: ".cdk-outputs.json",
                toSourcePath: ".",
              },
            ],
          },
        ],
      },
    }
  }
}
