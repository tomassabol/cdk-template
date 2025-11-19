/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// This file was adopted from https://github.com/aws-samples/aws-cdk-project-template-for-devops

import * as cdk from "aws-cdk-lib"
import * as codepipeline from "aws-cdk-lib/aws-codepipeline"
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions"
import * as codecommit from "aws-cdk-lib/aws-codecommit"
import * as codebuild from "aws-cdk-lib/aws-codebuild"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as targets from "aws-cdk-lib/aws-events-targets"
import * as s3 from "aws-cdk-lib/aws-s3"
import assert from "assert"
import { BuildEnvironment, BuildSpec } from "aws-cdk-lib/aws-codebuild"
import { BaseStack } from "../../stack/base/base-stack"
import { Construct } from "constructs"
import { resourceName } from "../../common/common-utils"

const CDK_VERSION = "@2"

/**
 * Defaults for build projects
 */

const BUILD_PROJECT_DEFAULTS = {
  // Node.js version for runtime. Selected version must be supported by build image type
  // See https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html#linux-runtimes
  nodeJsVersion: 22,

  // Computing environment
  environment: {
    // See https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html#linux-runtimes
    buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
    // See https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-compute-types.html
    computeType: codebuild.ComputeType.SMALL,
    privileged: true,
  },
}

export type PipelineSimplePatternProps = {
  /**
   * Name of pipeline
   *
   * @default "{projectName}-{stage}-app-pipeline"
   */
  pipelineName?: string

  /**
   * Pipeline actions
   */
  actionFlow: ActionProps[]

  /**
   * Policy statements to attach to pipeline actions
   *
   * @default: undefined
   */
  buildPolicies?: iam.PolicyStatement[]
}

export interface EventStateLambdaProps {
  FunctionName?: string
  CodePath: string
  Runtime: string
  Handler: string
}

enum ActionKindPrefix {
  Source = "Source",
  Approve = "Approve",
  Build = "Build",
  // Deploy = 'Deploy' // not yet supported
}

export enum ActionKind {
  SourceCodeStarConnection = "SourceCodeStarConnection",
  SourceCodeCommit = "SourceCodeCommit",
  SourceS3Bucket = "SourceS3Bucket",
  ApproveManual = "ApproveManual",
  BuildCodeBuild = "BuildCodeBuild",
  // DeployS3Bucket = 'DeployS3Bucket' // not yet supported
}

export interface ActionProps {
  kind: ActionKind
  name: string
  stage: string
  enable?: boolean
  order?: number
  eventStateLambda?: EventStateLambdaProps
  detail:
    | SourceCodeStarConnectionProps
    | SourceKindCodeCommitProps
    | ApproveKindManualProps
    | BuildKindCodeBuildProps
    | DeployKindS3BucketProps
}

type SourceCodeStarConnectionProps = {
  /**
   * Owner of the repository, e.g. "tomassaboldev"
   */
  repositoryOwner: string
  /**
   * Name of repository, e.g. "gb-my-project"
   */
  repositoryName: string
  /**
   * Branch to use as source, e.g. prod
   */
  repositoryBranch: string
  /**
   * Code build connection ARN
   */
  connectionArn: string
  /**
   * Set to true for a full clone of Git repository.
   * Needed for example when using SonarQube scanner in order to access git repository
   * to include git blame in the analysis.
   *
   * @default false
   */
  fullGitClone?: boolean
}

export interface SourceKindCodeCommitProps {
  repositoryName: string
  repositoryBranch: string
}

export interface SourceKindS3BucketProps {
  bucketName: string
  bucketKey: string
  account?: string
  region?: string
}

export interface ApproveKindManualProps {
  description?: string
}

export interface BuildDeployStacksProps {
  preCommands?: string[]
  stackNameList: string[]
  postCommands?: string[]
}

export interface BuildKindCodeBuildProps {
  /** AppConfig file used for CDK deployment */
  appConfigFile: string
  /** Optional list of build commands */
  buildCommands?: string[]
  /** Optional name of file with build specification */
  buildSpecFile?: string
  /** Optional list of stacks to be deployed */
  buildDeployStacks?: BuildDeployStacksProps
  buildAssumeRoleArn?: string
  /**
   * Runtime environment selection for the build
   * @default { buildImage: "AMAZON_LINUX_2_4", computeType: "SMALL", privileged: true }
   */
  buildEnvironment?: BuildEnvironment
  /**
   * Additional environment variables set for deployment
   *
   * These environment variables are defined by default: ACCOUNT, REGION, PROJECT_NAME,
   * STAGE, APP_CONFIG, ASSUME_ROLE_ARN, ON_PIPELINE
   */
  environmentVariables?: Record<string, string>
  description?: string
  /**
   * Optional export of artifact from the build action
   */
  exportArtifacts?: ExportArtifactsSpec
  /**
   * Optional additional imported artifacts (apart from source output)
   */
  importArtifacts?: ImportArtifactsSpec[]
  /**
   * Install supported software packages
   */
  installPackages?: CustomPackage[]
}

/**
 * See https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html#build-spec-ref-syntax
 */

export type ExportArtifactsSpec = {
  /**
   * Name of artifact, will be used to reference it when importing artifacts in another action
   */
  name: string
  /**
   * List of directories to export as artifacts
   */
  files: string[]
  /**
   * Optional top-level directory for mapping of files to artifacts
   */
  baseDirectory?: string
  /**
   * List of excluded paths
   */
  excludePaths?: string[]
}

/**
 * Define extra artifacts to import into build project
 */

export type ImportArtifactsSpec = {
  /**
   * Name of artifacts as specified in exportArtifacts.name
   */
  name: string
  /**
   * Optional copy commands to copy artifacts to source directory
   */
  copyArtifacts?: Array<{
    fromArtifactPath: string
    toSourcePath: string
    recursive?: boolean
  }>
}

export type CustomPackage = "SonarScanner" | "GhostScript"

export interface DeployKindS3BucketProps {
  bucketName: string
  account?: string
  region?: string
}

export class PipelineSimplePattern extends Construct {
  /**
   * Created pipeline
   */
  public codePipeline: codepipeline.Pipeline
  /**
   * Artifact to store output from source action. Usually it contains git repository content.
   */
  private sourceOutput: codepipeline.Artifact | undefined
  /**
   * Build output of createActionDeployS3Bucket, not used for the moment
   */
  private buildOutput: codepipeline.Artifact | undefined
  /**
   * Set of stages created for the pipeline
   */
  private stageMap = new Map<string, codepipeline.IStage>()
  /**
   * List of names of exported artifacts
   */
  private exportedArtifacts = new Map<string, codepipeline.Artifact>()

  constructor(
    scope: Construct,
    baseName: string,
    props: PipelineSimplePatternProps
  ) {
    super(scope, baseName)

    const baseStack = BaseStack.of(this)
    const { projectName, stageName } = baseStack

    const { pipelineName = `${projectName}-${stageName}-app-pipeline` } = props

    const { actionFlow } = props
    const configValid = this.validatePipelineConfig(pipelineName, actionFlow)

    if (configValid) {
      /*
       * Create S3 bucket. Normally it is created automatically by codepipeline.Pipeline construct.
       * However we want to setup a proper name and removal policy
       */

      const artifactBucket = new s3.Bucket(this, "source-bucket", {
        bucketName: pipelineName + "-artifact-bucket",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      })

      this.codePipeline = new codepipeline.Pipeline(this, baseName, {
        pipelineName,
        artifactBucket,
        // enableKeyRotation: true,
      })

      const { buildPolicies } = props

      for (const actionProps of actionFlow) {
        const actionKind: ActionKind = baseStack.findEnumType(
          ActionKind,
          actionProps.kind
        )

        if (actionProps.enable ?? true) {
          const success = this.registerAction(
            actionKind,
            actionProps,
            buildPolicies
          )
          if (!success) {
            break
          }
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.info("No source repository, or ActionFlow Config is wrong.")
      throw Error("PipelineConfig is wrong.")
    }
  }

  private validatePipelineConfig(
    pipelineBaseName: string,
    actionFlow: ActionProps[]
  ): { valid: boolean; error?: string } {
    if (!pipelineBaseName || pipelineBaseName.trim().length <= 2) {
      return {
        valid: false,
        error: "Invalid pipeline name",
      }
    }

    if (!actionFlow || actionFlow.length < 2) {
      return {
        valid: false,
        error: "Pipeline should have at least two actions",
      }
    }

    let haveSource = false
    let haveOther = false

    for (const [index, actionProps] of actionFlow.entries()) {
      if (index === 0) {
        const kind = BaseStack.of(this).findEnumType(
          ActionKind,
          actionProps.kind
        )
        if (
          (actionProps.enable ?? true) &&
          kind.startsWith(ActionKindPrefix.Source)
        ) {
          if (haveSource) {
            return {
              valid: false,
              error: "Only one source is supported by simple pipeline pattern",
            }
          }
          haveSource = true
        }
      } else {
        if (actionProps.enable ?? true) {
          haveOther = true
          break
        }
      }
    }

    if (!haveSource) {
      return {
        valid: false,
        error: "Source is not defined",
      }
    }

    if (!haveOther) {
      return {
        valid: false,
        error: "No build or other action defined",
      }
    }

    return {
      valid: true,
    }
  }

  /**
   * Create action for a stage
   */

  private registerAction(
    actionKind: ActionKind,
    actionProps: ActionProps,
    buildPolicies?: iam.PolicyStatement[]
  ): boolean {
    let success = true

    switch (actionKind) {
      case ActionKind.SourceCodeStarConnection:
        {
          const props = actionProps.detail as SourceCodeStarConnectionProps
          const stage = this.addStage(actionProps.stage)

          stage.addAction(
            this.createActionSourceCodeStarConnection(
              actionProps.name,
              props,
              actionProps.order
            )
          )
        }
        break

      case ActionKind.SourceCodeCommit:
        {
          const props = actionProps.detail as SourceKindCodeCommitProps
          const stage = this.addStage(actionProps.stage)

          stage.addAction(
            this.createActionSourceCodeCommit(
              actionProps.name,
              props,
              actionProps.order
            )
          )
        }
        break

      case ActionKind.SourceS3Bucket:
        {
          const props = actionProps.detail as SourceKindS3BucketProps
          const stage = this.addStage(actionProps.stage)

          stage.addAction(
            this.createActionSourceS3Bucket(
              actionProps.name,
              props,
              actionProps.order
            )
          )
        }
        break

      case ActionKind.ApproveManual:
        {
          const props = actionProps.detail as ApproveKindManualProps
          const stage = this.addStage(actionProps.stage)

          stage.addAction(
            this.createActionApproveManual(
              actionProps.name,
              props,
              actionProps.order
            )
          )
        }
        break

      case ActionKind.BuildCodeBuild:
        {
          const props = actionProps.detail as BuildKindCodeBuildProps
          const stage = this.addStage(actionProps.stage)
          const action = this.createActionBuildCodeBuild(
            actionProps,
            props,
            buildPolicies
          )

          if (action) {
            stage.addAction(action)
            this.registerEventLambda(actionProps, action)
          } else {
            // eslint-disable-next-line no-console
            console.error(
              "[ERROR] fail to create build-action",
              actionProps.name
            )
            success = false
          }
        }
        break

      default:
        // eslint-disable-next-line no-console
        console.error("[ERROR] not supported action", actionProps.kind)
        success = false
    }
    // } else if (actionType === ActionType.Deploy) {
    //     if (actionKind == ActionKind.DeployS3Bucket) {
    //         const props = actionProps.Detail as DeployKindS3BucketProps;
    //         const stage = this.addStage(actionProps.Stage);
    //         const action = this.createActionDeployS3Bucket(actionProps.Name, props, actionProps.Order);

    //         if (action) {
    //             stage.addAction(action);
    //             this.registerEventLambda(actionProps, action);
    //         } else {
    //             console.error('[ERROR] fail to create deploy-action', actionProps.Name);
    //             success = false;
    //         }
    //     } else {
    //         console.error('[ERROR] not supported DeployKind', actionProps.Kind);
    //         success = false;
    //     }
    // }

    return success
  }

  private addStage(stageName: string): codepipeline.IStage {
    /**
     * Set of stages created for the pipeline
     */
    if (this.stageMap.has(stageName)) {
      /**
       * Set of stages created for the pipeline
       */
      const stage = this.stageMap.get(stageName)
      assert(stage, "Invalid stage " + stageName)
      return stage
    } else {
      const stage = this.codePipeline.addStage({ stageName })
      /**
       * Set of stages created for the pipeline
       */
      this.stageMap.set(stageName, stage)
      return stage
    }
  }

  private createActionSourceCodeStarConnection(
    actionName: string,
    props: SourceCodeStarConnectionProps,
    runOrder?: number
  ) {
    this.sourceOutput = new codepipeline.Artifact("SourceOutput")

    const action = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName, // "BitBucket_Source",
      owner: props.repositoryOwner,
      repo: props.repositoryName,
      branch: props.repositoryBranch,
      output: this.sourceOutput,
      connectionArn: props.connectionArn,
      runOrder,
      codeBuildCloneOutput: props.fullGitClone,
    })

    return action
  }

  private createActionSourceCodeCommit(
    actionName: string,
    props: SourceKindCodeCommitProps,
    runOrder?: number
  ): codepipeline.IAction {
    const repo = codecommit.Repository.fromRepositoryName(
      this,
      "CodeCommit-Repository",
      props.repositoryName
    )

    this.sourceOutput = new codepipeline.Artifact("SourceOutput")
    const action = new codepipeline_actions.CodeCommitSourceAction({
      actionName,
      repository: repo,
      output: this.sourceOutput,
      branch: props.repositoryBranch,
      codeBuildCloneOutput: true,
      runOrder,
    })

    return action
  }

  private createActionSourceS3Bucket(
    actionName: string,
    props: SourceKindS3BucketProps,
    runOrder?: number
  ): codepipeline.IAction {
    const bucket = s3.Bucket.fromBucketAttributes(
      this,
      `${actionName}SourceS3Bucket`,
      {
        bucketName: props.bucketName,
        account: props.account,
        region: props.region,
      }
    )

    this.sourceOutput = new codepipeline.Artifact("SourceOutput")
    const action = new codepipeline_actions.S3SourceAction({
      actionName,
      bucket,
      bucketKey: props.bucketKey,
      output: this.sourceOutput,
      runOrder,
    })

    return action
  }

  private createActionApproveManual(
    actionName: string,
    props: ApproveKindManualProps,
    runOrder?: number
  ): codepipeline.IAction {
    return new codepipeline_actions.ManualApprovalAction({
      actionName,
      additionalInformation: props.description,
      runOrder,
    })
  }

  /**
   * Create CodeBuild project
   */

  private createActionBuildCodeBuild(
    actionProps: ActionProps,
    buildProps: BuildKindCodeBuildProps,
    buildPolicies?: iam.PolicyStatement[]
  ): codepipeline.IAction | undefined {
    if (!this.sourceOutput) throw new Error("SourceOutput is undefined")

    const buildSpec = this.createBuildSpec(buildProps)

    assert(buildSpec, "Invalid build spec")

    const project = this.createPipelineProject(
      actionProps,
      buildProps,
      buildSpec
    )

    project.addToRolePolicy(this.getDeployCommonPolicy())

    if (buildPolicies) {
      buildPolicies.forEach((policy) => project.addToRolePolicy(policy))
    } else {
      project.role?.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
      )
    }

    const outputs = []

    if (buildProps.exportArtifacts) {
      const artifactName = buildProps.exportArtifacts.name

      if (!artifactName.match(/\w+/)) {
        throw new Error(
          `Invalid artifact name '${artifactName}', identifier must contain only alphanumeric characters and underscores`
        )
      }

      if (artifactName.length >= 128) {
        throw new Error(
          `Invalid artifact name '${artifactName}', must be less then 128 characters`
        )
      }

      if (this.exportedArtifacts.has(artifactName)) {
        throw new Error(`Duplicate name of exported artifacts '${artifactName}`)
      }

      const artifactsOutput = new codepipeline.Artifact(
        buildProps.exportArtifacts.name
      )
      this.exportedArtifacts.set(artifactName, artifactsOutput)

      outputs.push(artifactsOutput)
    }

    const extraInputs: codepipeline.Artifact[] = []

    if (buildProps.importArtifacts) {
      buildProps.importArtifacts.forEach((item) => {
        const input = this.exportedArtifacts.get(item.name)
        if (input) {
          extraInputs.push(input)
        } else {
          throw new Error(`Imported artifacts '${item.name}' not found`)
        }
      })
    }

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: actionProps.name,
      project,
      input: this.sourceOutput,
      runOrder: actionProps.order,
      extraInputs,
      outputs,
    })
    return buildAction
  }

  /**
   * Compose build specification
   *
   * There are three possibilities how to specify build spec:
   * - buildCommands - direct input of build commands
   * - buildDeployStack - generate CDK deployments from list of stack names
   * - fromSourceFilename - import build spec from a file
   */

  private createBuildSpec(buildProps: BuildKindCodeBuildProps) {
    const assumeRoleEnable = buildProps.buildAssumeRoleArn ? true : false
    if (buildProps.buildCommands && buildProps.buildCommands.length > 0) {
      return this.createBuildSpecUsingCommands(
        buildProps.buildCommands,
        assumeRoleEnable,
        buildProps
      )
    } else if (
      buildProps.buildDeployStacks &&
      buildProps.buildDeployStacks.stackNameList.length > 0
    ) {
      return this.createBuildSpecUsingStackName(
        buildProps.buildDeployStacks,
        assumeRoleEnable,
        buildProps
      )
    } else if (
      buildProps.buildSpecFile &&
      buildProps.buildSpecFile.length > 3
    ) {
      return codebuild.BuildSpec.fromSourceFilename(buildProps.buildSpecFile)
    } else {
      // eslint-disable-next-line no-console
      console.error("[ERROR] not supported CodeBuild - BuildSpecType")
    }
  }

  private createBuildSpecUsingCommands(
    buildCommands: string[],
    assumeRoleEnable: boolean,
    buildProps: BuildKindCodeBuildProps
  ): codebuild.BuildSpec {
    const { exportArtifacts, importArtifacts, installPackages } = buildProps

    const buildSpec = codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          // https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html
          "runtime-versions": {
            nodejs: BUILD_PROJECT_DEFAULTS.nodeJsVersion,
          },
          commands: this.createInstallCommands({
            assumeRoleEnable,
            installPackages,
            importArtifacts,
          }),
        },
        pre_build: {
          commands: ["pwd", "ls -l"],
        },
        build: {
          commands: buildCommands,
        },
        post_build: {
          commands: ["pwd", "ls -l"],
        },
      },
      ...this.createExportedArtifactsBuildSpec(exportArtifacts),
    })
    return buildSpec
  }

  // See https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
  private createBuildSpecUsingStackName(
    props: BuildDeployStacksProps,
    assumeRoleEnable: boolean,
    buildProps: BuildKindCodeBuildProps
  ): codebuild.BuildSpec {
    const { exportArtifacts, importArtifacts, installPackages } = buildProps

    const cdkDeployStacksCommands = props.stackNameList.map((stackName) => {
      const args = stackName.trim().split(" ")
      const [pureStackName] = args
      args[0] = `cdk deploy *${pureStackName}* --require-approval never`
      return args.join(" ")
    })

    const buildSpec = codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          "runtime-versions": {
            nodejs: BUILD_PROJECT_DEFAULTS.nodeJsVersion,
          },
          commands: this.createInstallCommands({
            assumeRoleEnable,
            setupEnable: true,
            importArtifacts,
            installPackages,
          }),
        },
        pre_build: {
          commands: props.preCommands,
        },
        build: {
          commands: cdkDeployStacksCommands,
        },
        post_build: {
          commands: props.postCommands,
        },
      },
      ...this.createExportedArtifactsBuildSpec(exportArtifacts),
    })
    return buildSpec
  }

  private createExportedArtifactsBuildSpec(
    exportArtifacts: ExportArtifactsSpec | undefined
  ) {
    if (exportArtifacts === undefined) return undefined

    const { files, baseDirectory, excludePaths } = exportArtifacts

    return {
      artifacts: {
        files,
        baseDirectory,
        excludePaths,
      },
    }
  }

  private createPipelineProject(
    actionProps: ActionProps,
    buildProps: BuildKindCodeBuildProps,
    buildSpec: BuildSpec
  ) {
    const { appConfig } = BaseStack.of(this)
    const environmentVariables: Record<
      string,
      codebuild.BuildEnvironmentVariable
    > = {
      ACCOUNT: { value: `${appConfig.project.account}` },
      REGION: { value: `${appConfig.project.region}` },
      PROJECT_NAME: { value: `${appConfig.project.name}` },
      STAGE: { value: `${appConfig.project.stage}` },
      APP_CONFIG: { value: buildProps.appConfigFile },
      ASSUME_ROLE_ARN: {
        value: buildProps.buildAssumeRoleArn ?? "",
      },
      ON_PIPELINE: { value: "YES" },
    }

    const projectRegions = appConfig.project.regions ?? []
    if (projectRegions.length > 0) {
      environmentVariables.REGIONS = {
        value: projectRegions.join(","),
      }
    }

    if (buildProps.environmentVariables) {
      Object.entries(buildProps.environmentVariables).forEach(
        ([key, value]) => {
          environmentVariables[key] = { value }
        }
      )
    }

    return new codebuild.PipelineProject(
      this,
      `${actionProps.stage}-${actionProps.name}-Project`,
      {
        projectName: resourceName(this, actionProps.name, "project"),
        environment: {
          ...BUILD_PROJECT_DEFAULTS.environment,
          ...buildProps.buildEnvironment,
        },
        environmentVariables,
        buildSpec,
        timeout: cdk.Duration.minutes(60),
        description: buildProps.description,
      }
    )
  }

  /**
   * Not used
   */

  private createActionDeployS3Bucket(
    actionName: string,
    props: DeployKindS3BucketProps,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runOrder?: number
  ): codepipeline.IAction {
    const bucket = s3.Bucket.fromBucketAttributes(
      this,
      `${actionName}DeployS3Bucket`,
      {
        bucketName: props.bucketName,
        account: props.account,
        region: props.region,
      }
    )

    if (this.buildOutput) {
      const action = new codepipeline_actions.S3DeployAction({
        actionName,
        input: this.buildOutput,
        bucket,
      })

      return action
    } else {
      throw new Error("BuildOutput is undefined")
    }
  }

  private createInstallCommands(params: {
    assumeRoleEnable?: boolean
    setupEnable?: boolean
    importArtifacts?: ImportArtifactsSpec[]
    installPackages?: CustomPackage[]
  }): string[] {
    const {
      assumeRoleEnable = false,
      setupEnable = false,
      installPackages = [],
      importArtifacts = [],
    } = params

    let commands: string[] = []

    const assumeRoleCommands = [
      "creds=$(mktemp -d)/creds.json",
      "aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name assume_role > $creds",
      `export AWS_ACCESS_KEY_ID=$(cat $creds | grep "AccessKeyId" | cut -d '"' -f 4)`,
      `export AWS_SECRET_ACCESS_KEY=$(cat $creds | grep "SecretAccessKey" | cut -d '"' -f 4)`,
      `export AWS_SESSION_TOKEN=$(cat $creds | grep "SessionToken" | cut -d '"' -f 4)`,
    ]

    const setupInstallCommands = [
      `npm install -g aws-cdk${CDK_VERSION}`,
      "npm ci",
    ]

    if (assumeRoleEnable) {
      commands = commands.concat(assumeRoleCommands)
    }
    if (setupEnable) {
      commands = commands.concat(setupInstallCommands)
    }

    // Install SonarQube scanner
    if (installPackages.includes("SonarScanner")) {
      commands = commands.concat([
        "wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.7.0.2747-linux.zip -P tmp --quiet",
        "unzip -q tmp/sonar-scanner-cli-4.7.0.2747-linux.zip",
        "export PATH=$PATH:`pwd`/sonar-scanner-4.7.0.2747-linux/bin",
        "sonar-scanner -v",
      ])
    }

    // Install GhostScript
    if (installPackages.includes("GhostScript")) {
      commands = commands.concat([
        // Install GhostScript
        "wget https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs1000/ghostscript-10.0.0-linux-x86_64.tgz -P tmp --quiet",
        "tar -xf tmp/ghostscript-10.0.0-linux-x86_64.tgz",
        "cp ghostscript-10.0.0-linux-x86_64/gs-1000-linux-x86_64 ghostscript-10.0.0-linux-x86_64/gs",
        "export PATH=$PATH:`pwd`/ghostscript-10.0.0-linux-x86_64",
        "gs --version",
      ])
    }

    importArtifacts.forEach((item) => {
      const { name, copyArtifacts } = item
      if (copyArtifacts) {
        copyArtifacts.forEach(
          ({ fromArtifactPath: from, toSourcePath: to, recursive }) => {
            commands.push(
              `cp ${
                recursive ? "-R" : ""
              } $CODEBUILD_SRC_DIR_${name}/${from} ${to}`
            )
          }
        )
      }
    })

    return commands
  }

  private getDeployCommonPolicy(): iam.PolicyStatement {
    const statement = new iam.PolicyStatement()
    statement.addActions(
      "cloudformation:*",
      "lambda:*",
      "s3:*",
      "ssm:*",
      "iam:PassRole",
      "kms:*",
      "events:*",
      "sts:AssumeRole"
    )
    statement.addResources("*")
    return statement
  }

  private registerEventLambda(
    actionProps: ActionProps,
    action: codepipeline.IAction
  ) {
    if (
      actionProps.eventStateLambda &&
      actionProps.eventStateLambda.CodePath &&
      actionProps.eventStateLambda.CodePath.length > 0 &&
      actionProps.eventStateLambda.Handler &&
      actionProps.eventStateLambda.Handler.length > 0
    ) {
      action?.onStateChange(
        `${actionProps.stage}-${actionProps.name}-EventState`,
        new targets.LambdaFunction(
          this.createEventStateLambda(
            `${actionProps.stage}-${actionProps.name}-EventStateLambda`,
            actionProps.eventStateLambda
          )
        )
      )
    }
  }

  private createEventStateLambda(
    baseName: string,
    props: EventStateLambdaProps
  ): lambda.Function {
    const func = new lambda.Function(this, baseName, {
      functionName: resourceName(this, baseName, "function"),
      runtime: new lambda.Runtime(props.Runtime),
      code: lambda.Code.fromAsset(props.CodePath),
      handler: props.Handler,
    })

    return func
  }
}
