import * as appconfig from "aws-cdk-lib/aws-appconfig"
import * as codepipeline from "aws-cdk-lib/aws-codepipeline"
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import path from "path"
import { AppConfigDeployAction } from "./codepipeline-app-config-deploy-action"
import { Construct } from "constructs"
import { BaseStack } from "../../../stack/base/base-stack"

export type AppConfigDeploymentPipelineSimplePatternProps = {
  /**
   * Name of AppConfig application
   * @default "{projectName}-{stage}"
   */
  appName?: string

  /**
   * Description of AppConfig application
   *
   * @default "Application configuration"
   */
  appDescription?: string

  /**
   * Pipeline name
   *
   * @default "{projectName}-{stage}-config-pipeline"
   */
  pipelineName?: string

  /**
   * Name of AppConfig folder where to find config files.
   * It is prepended by stack parameter `configRepositoryRootFolder` if it is defined.
   *
   * @default "prod" for production; "test" for other stages
   */
  configFolder?: string
}

/**
 * Construct for AppConfig deployment pipeline.
 *
 * Create CodePipeline to deploy configuration changes to AWS AppConfig service
 *
 * Using stack parameters in `infra/config/app-config-{STAGE}.json`:
 * - configCodestarConnectionArn - ARN of codestar connection to connect to BitBucket repo (mandatory)
 * - configRepositoryOwner - Owner of source BitBucket repository (mandatory)
 * - configRepositoryName - Name of source BitBucket repository (mandatory)
 * - configRepositoryBranch - Branch of source Bitbucket repository (default is stage name)
 * - configRepositoryRootFolder - Root folder of configuration files in the repo (default is repository root)
 *
 * Configuration repository should have this structure of config root folder:
 * ```text
 * (configRepositoryRootFolder)
 * +- prod
 * |  +- app.json
 * +- test
 *    +- app.json
 * ```
 * @example
 *
 * ```typescript
 * const pipeline = new AppConfigDeploymentPipelineSimplePattern(this, "app-config")
 * ```
 */

export class AppConfigDeploymentPipelineSimplePattern extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: AppConfigDeploymentPipelineSimplePatternProps = {}
  ) {
    super(scope, id)

    const baseStack = BaseStack.of(this)
    const { projectName, stageName } = baseStack

    const {
      appName = `${projectName}-${stageName}`,
      appDescription = "Application configuration",
      pipelineName = `${projectName}-${stageName}-config-pipeline`,
    } = props

    const stackParams = {
      connectionArn: baseStack.getStackConfigParameter({
        name: "configCodestarConnectionArn",
        type: "string",
        required: true,
      }),
      repositoryOwner: baseStack.getStackConfigParameter({
        name: "configRepositoryOwner",
        type: "string",
        required: true,
      }),
      repositoryName: baseStack.getStackConfigParameter({
        name: "configRepositoryName",
        type: "string",
        required: true,
      }),
      repositoryBranch: baseStack.getStackConfigParameter({
        name: "configRepositoryBranch",
        type: "string",
        defaultValue: stageName,
      }),
      configRepositoryRootFolder: baseStack.getStackConfigParameter({
        name: "configRepositoryRootFolder",
        type: "string",
        defaultValue: "",
      }),
    }

    /*
     * AppConfig setup
     */

    const application = new appconfig.CfnApplication(
      this,
      "AppConfig Application",
      {
        name: appName,
        description: appDescription,
      }
    )

    const deploymentStrategy = new appconfig.CfnDeploymentStrategy(
      this,
      "AppConfig Deployment Strategy",
      {
        name: "Instant",
        description: "Instant deployment",
        deploymentDurationInMinutes: 0,
        finalBakeTimeInMinutes: 0,
        growthFactor: 100,
        growthType: "LINEAR",
        replicateTo: "NONE",
      }
    )

    const applicationId = application.ref
    const deploymentStrategyId = deploymentStrategy.ref

    const environment = new appconfig.CfnEnvironment(
      this,
      "AppConfig Environment",
      {
        applicationId,
        name: "default",
        description: `${stageName} stage`,
      }
    )

    /*
     * AppConfig configuration profiles
     */

    const defaultConfigurationProfile =
      this.createBitbucketConfigurationProfile({
        name: "app",
        applicationId,
      })

    /**
     * Select config subfolder
     */

    const defaultConfigFolder = stageName === "prod" ? "production" : "test"

    /*
     * Base path for configuration files in the repo
     */

    const repositoryBasePath = path.join(
      stackParams.configRepositoryRootFolder,
      props.configFolder || defaultConfigFolder
    )

    /*
     * AppConfig configuration profiles
     */

    const configurationProfiles = [
      /*
       * Carrier services
       */
      {
        name: "configuration",
        profileId: defaultConfigurationProfile.ref,
        path: `${repositoryBasePath}/app.json`,
      },
    ]

    /*
     * CodePipeline pipeline
     */

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName,
    })

    /*
     * Source stage
     */

    const sourceOutput = new codepipeline.Artifact()

    const sourceAction =
      new codepipeline_actions.CodeStarConnectionsSourceAction({
        actionName: "BitBucket_Source",
        owner: stackParams.repositoryOwner,
        repo: stackParams.repositoryName,
        branch: stackParams.repositoryBranch,
        output: sourceOutput,
        connectionArn: stackParams.connectionArn,
      })

    pipeline.addStage({
      stageName: "Source",
      actions: [sourceAction],
    })

    /*
     * Deployment stage
     */

    const deployActions = configurationProfiles.map(
      ({ name, path, profileId }, index) => {
        return new AppConfigDeployAction({
          name,
          applicationId,
          environmentId: environment.ref,
          configurationProfileId: profileId,
          deploymentStrategyId,
          inputArtifactConfigurationPath: path,
          input: sourceOutput,
          runOrder: index + 1,
        })
      }
    )

    pipeline.addStage({
      stageName: "Deployment-to-AppConfig",
      actions: deployActions,
    })
  }

  /**
   * Grant access to AppConfig data to a lambda function.
   */

  public grantAccess(lambdaFunction: lambda.IFunction) {
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "appconfig:GetLatestConfiguration",
          "appconfig:StartConfigurationSession",
        ],
        resources: ["*"],
      })
    )
  }

  /**
   * Create AppConfig configuration profile
   */

  private createBitbucketConfigurationProfile(props: {
    name: string
    applicationId: string
    validationJsonSchema?: object
  }) {
    const { name, applicationId, validationJsonSchema } = props

    return new appconfig.CfnConfigurationProfile(this, `${name}-profile`, {
      applicationId,
      name,
      description: `Configuration of ${name}`,
      locationUri: "codepipeline://pipeline",
      ...(validationJsonSchema && {
        validators: [
          {
            content: JSON.stringify(validationJsonSchema, null, 2),
            type: "JSON_SCHEMA",
          },
        ],
      }),
    })
  }
}
