import * as cdk from "aws-cdk-lib"
import * as appconfig from "aws-cdk-lib/aws-appconfig"
import { Construct } from "constructs"
// import { IFeatureFlagConfiguration } from "@tomassabol/app-config-helpers"
import { baseStackOf } from "../../../common/common-utils"

/**
 * Feature flags configuration profile for AWS AppConfig service
 *
 * - Auto deploy is enabled only for non-prod stages
 * - Deployment is done using instant deployment strategy created in a global
 *   stack gb-app-config-instant-deployment
 *
 * @example
 * ```ts
 * const featureFlags = new FeatureFlagsSimplePattern(this, "feature-flags", {
 *   features: {
 *     version: "1",
 *     flags: {
 *       feature1: {name: "Feature 1"},
 *       feature2: {name: "Feature 2"},
 *     }
 *   },
 * })
 *
 * featureFlags.grantAccess(myLambda)
 * featureFlags.addEnvironmentVars(myLambda)
 * ```
 *
 */
export class FeatureFlagsSimplePattern extends Construct {
  public application: appconfig.Application
  public environment: appconfig.Environment
  public configurationProfile: appconfig.HostedConfiguration

  public applicationName: string
  public environmentName: string
  public configurationProfileName: string

  constructor(
    scope: Construct,
    name: string,
    props: {
      /** Feature flags configuration */
      // features: IFeatureFlagConfiguration
      /** Enable deployment. Auto means deploy only non-production environments */
      deploy?: boolean | "auto"
      /** Application name default is project-stage */
      applicationName?: string
      /** Environment name default is stage */
      environmentName?: string
      /** Profile name default is feature-flags */
      profileName?: string
    }
  ) {
    super(scope, name)

    const { projectName, stageName } = baseStackOf(this)

    const {
      applicationName = `${projectName}-${stageName}`,
      environmentName = stageName,
      profileName = "feature-flags",
    } = props

    this.applicationName = applicationName
    this.environmentName = environmentName
    this.configurationProfileName = profileName

    const application = new appconfig.Application(this, "app-config", {
      applicationName,
    })
    this.application = application

    const environment = new appconfig.Environment(this, "environment", {
      application,
      environmentName,
    })
    this.environment = environment

    const deployTo = props?.deploy ? [environment] : undefined

    this.configurationProfile = new appconfig.HostedConfiguration(
      this,
      "HostedConfig1",
      {
        application,
        name: profileName,
        content: appconfig.ConfigurationContent.fromInlineJson(
          // JSON.stringify(props.features)
          JSON.stringify({})
        ),
        type: appconfig.ConfigurationType.FEATURE_FLAGS,
        deployTo,
        deploymentStrategy: this.getDeploymentStrategy(),
      }
    )
  }

  /**
   * Grant access to AppConfig to a lambda function
   */

  public grantAccess(lambdaFunction: cdk.aws_lambda.IFunction) {
    lambdaFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: [
          "appconfig:GetLatestConfiguration",
          "appconfig:StartConfigurationSession",
        ],
        resources: ["*"],
      })
    )
  }

  /**
   * Add environment variables to a lambda function to access AppConfig:
   *   - FEATURE_FLAGS_APP - AppConfig application
   *   - FEATURE_FLAGS_ENV - AppConfig environment
   *   - FEATURE_FLAGS_CONFIG - AppConfig profile
   */

  public addEnvironmentVars(lambdaFunction: cdk.aws_lambda.Function) {
    lambdaFunction.addEnvironment("FEATURE_FLAGS_APP", this.applicationName)
    lambdaFunction.addEnvironment("FEATURE_FLAGS_ENV", this.environmentName)
    lambdaFunction.addEnvironment(
      "FEATURE_FLAGS_CONFIG",
      this.configurationProfileName
    )
  }

  /**
   * Get instant deployment strategy from a shared stack
   */

  private getDeploymentStrategy(): appconfig.IDeploymentStrategy {
    const instantDeploymentStrategyId = cdk.Fn.importValue(
      "global-instant-deployment-strategy-id"
    )

    return appconfig.DeploymentStrategy.fromDeploymentStrategyId(
      this,
      "deployment-strategy",
      appconfig.DeploymentStrategyId.fromString(instantDeploymentStrategyId)
    )
  }
}
