import * as iam from "aws-cdk-lib/aws-iam"
import * as codepipeline from "aws-cdk-lib/aws-codepipeline"
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions"
import { Construct } from "constructs"

/**
 * CodePipeline Deploy action for AppConfig service.
 */

export type AppConfigDeployActionProps = {
  /** Action name (usually same as AppConfig configuration profile name */
  name: string
  /** AppConfig application id */
  applicationId: string
  /** AppConfig environment id */
  environmentId: string
  /** AppConfig configuration profile id */
  configurationProfileId: string
  /** AddConfig deployment strategy id */
  deploymentStrategyId: string
  /** Name of the file in the input artifacts to be used to update the configuration profile */
  inputArtifactConfigurationPath: string
  /** Input artifacts e.g. output from Bitbucket source action */
  input: codepipeline.Artifact
  /** Optional run order, starting from 1 */
  runOrder?: number
}

/**
 * CodePipeline deploy action for AWS AppConfig service
 */

export class AppConfigDeployAction extends codepipeline_actions.Action {
  private props: AppConfigDeployActionProps

  constructor(props: AppConfigDeployActionProps) {
    super({
      actionName: `AppConfigDeploy-${props.name}`,
      category: codepipeline.ActionCategory.DEPLOY,
      provider: "AppConfig",
      owner: "AWS",
      artifactBounds: deployArtifactBounds(),
      version: "1",
      inputs: [props.input],
      runOrder: props.runOrder,
    })
    this.props = props
  }

  protected bound(
    _scope: Construct,
    _stage: codepipeline.IStage,
    options: codepipeline.ActionBindOptions
  ): codepipeline.ActionConfig {
    // permissions based on CodePipeline documentation:
    // https://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-custom-role.html#how-to-update-role-new-services
    options.role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          "appconfig:StartDeployment",
          "appconfig:StopDeployment",
          "appconfig:GetDeployment",
        ],
        resources: ["*"],
      })
    )

    options.bucket.grantRead(options.role) // Allow AppConfig service to read from source bucket

    return {
      configuration: {
        Application: this.props.applicationId,
        Environment: this.props.environmentId,
        ConfigurationProfile: this.props.configurationProfileId,
        DeploymentStrategy: this.props.deploymentStrategyId,
        InputArtifactConfigurationPath:
          this.props.inputArtifactConfigurationPath,
      },
    }
  }
}

/**
 * The ArtifactBounds that make sense for deploy Actions -
 * they have exactly one input, and don't produce any outputs.
 */

function deployArtifactBounds(): codepipeline.ActionArtifactBounds {
  return {
    minInputs: 1,
    maxInputs: 1,
    minOutputs: 0,
    maxOutputs: 0,
  }
}
