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

import assert from "assert"
import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as iam from "aws-cdk-lib/aws-iam"
import * as events from "aws-cdk-lib/aws-events"
import * as targets from "aws-cdk-lib/aws-events-targets"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import { AppContext, AppContextError } from "../../app-context"
import { StackConfig, StackType } from "../../app-config"
import { CommonHelper, ICommonHelper } from "../../common/common-helper"
import {
  CommonGuardian,
  CreateBucketOptions,
  CreateNodeLambdaFunctionOptions,
  ICommonGuardian,
  ResourceNameParams,
} from "../../common/common-guardian"
import {
  IServerlessImport,
  ServerlessImport,
  ServerlessResourceRef,
} from "../../common/serverless-import"
import {
  ComposeResourceNameParams,
  ComposeStackNameParams,
} from "../../common/common-coerce"
import { IBaseStack, WarmUpOptions } from "./base-stack-interface"
import { Constructor, ExtractStackConstructorProps } from "./utility-types"
import { Construct } from "constructs"

/**
 * Override decorator, reserved for future use
 */

export function Override(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  target: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  propertyKey: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  descriptor: PropertyDescriptor
) {
  // NOOP
}

/**
 * Limit of number of targets for CloudWatch Event rule
 */

const MAX_CLOUD_EVENT_RULE_TARGET_COUNT = 5

/**
 * Base class for stacks
 */

export class BaseStack extends cdk.Stack implements IBaseStack {
  /** Reference to self */
  public readonly stack: IBaseStack
  /** Stack configuration data from th app config file */
  public readonly stackConfig: StackConfig
  /** Type of stack */
  public readonly stackType: StackType
  /** App environment (AWS region and account) */
  public readonly env: cdk.Environment
  /** AppContext instance */
  public readonly appContext: AppContext
  /** Base stack name without region suffix (for resource naming) */
  public readonly baseStackName: string
  private commonHelper: ICommonHelper
  private commonGuardian: ICommonGuardian
  private serverlessImport: IServerlessImport

  /** Current CloudWatch Event rule where new warm up targets are added */
  private currentWarmUpRule: events.Rule | undefined

  /** Number of created warm up rules */
  private warmUpRuleCount = 0

  /** Number of targets added to current warm up rule */
  private currentWarmUpTargetCount = 0

  constructor(
    appContext: AppContext,
    stackConfig: StackConfig,
    props: cdk.StackProps = {}
  ) {
    const env = BaseStack.getEnvironment(appContext, stackConfig)
    super(appContext.cdkApp, stackConfig.name, { env, ...props })

    this.stack = this
    this.env = env
    this.appContext = appContext
    this.stackConfig = stackConfig
    this.stackType = appContext.validateStackType(stackConfig.stackType)

    // Extract base stack name (without region suffix) for resource naming
    this.baseStackName =
      stackConfig.baseStackName ||
      stackConfig.shortStackName ||
      stackConfig.name.replace(new RegExp(`-${this.region}$`), "")
    this.commonHelper = this.createCommonHelper()
    this.commonGuardian = this.createCommonGuardian()
    this.serverlessImport = this.createServerlessImport()

    /** Add default tags */
    const { tagPrefix = "" } = appContext
    cdk.Tags.of(this).add(tagPrefix + "stack", stackConfig.name)
  }

  /**
   * Create stacks from AppContext stack configuration for all project regions
   *
   * See https://github.com/Microsoft/TypeScript/issues/5863
   */

  public static fromAppContext<C extends Constructor>(
    this: C,
    appContext: AppContext,
    stackName: string,
    ...props: ExtractStackConstructorProps<C>
  ): InstanceType<C>[] {
    const stackConfig = appContext.appConfig.stacks[stackName]

    const deployStack =
      stackConfig?.deploy === undefined ||
      stackConfig?.deploy === true ||
      (stackConfig?.deploy as unknown as string) === "true" // Handle replacing with context from command line

    if (stackConfig && deployStack) {
      const stacks: InstanceType<C>[] = []
      for (const region of appContext.projectRegions) {
        // Create region-specific stacks with unique names
        const regionStackConfig = {
          ...stackConfig,
          name: `${stackConfig.name}-${region}`,
          updateRegionName: region,
          baseStackName: stackConfig.name, // Store the base name for resource naming
        }
        stacks.push(new this(appContext, regionStackConfig, ...props))
      }
      return stacks
    } else {
      return [] // If stack is not defined then return empty array
    }
  }

  public static of(scope: Construct): BaseStack {
    if (scope instanceof Construct) {
      const stack = cdk.Stack.of(scope)

      if (stack instanceof BaseStack) {
        return stack
      } else {
        if (cdk.Stack.isStack(scope)) {
          throw new Error(`Stack ${scope.node.path} in not a BaseStack`)
        } else if (cdk.Stack.isConstruct(scope)) {
          throw new Error(
            `Construct ${scope.node.path} is is not a child of a BaseStack`
          )
        }
      }
    }

    throw new Error(
      "Invalid parameter of baseStackOf: expected stack or construct"
    )
  }

  private _powertoolsLayer?: lambda.ILayerVersion

  /**
   * Reference layer with AWS Lambda Powertools for TypeScript
   * See https://awslabs.github.io/aws-lambda-powertools-typescript/latest/#install
   */
  public get powertoolsLayer(): lambda.ILayerVersion {
    if (!this._powertoolsLayer) {
      this._powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
        this,
        "LambdaPowertoolsLayer",
        `arn:aws:lambda:${
          cdk.Stack.of(this).region
        }:094274105915:layer:AWSLambdaPowertoolsTypeScript:40`
      )
    }
    return this._powertoolsLayer
  }

  /**
   * Get a parameter from stack configuration parameters
   */

  public getStackConfigParameter = (param: {
    name: string
    type: string
    required?: boolean
    defaultValue?: unknown
  }) => {
    const { name, type, required, defaultValue } = param
    const value = getConfigValue(this.stackConfig, name)

    if (value === undefined) {
      if (required) {
        throw new AppContextError(
          `Parameter "${param.name}" is missing for stack "${this.stackConfig.shortStackName}" in ${this.appConfigPath}.`
        )
      } else {
        return defaultValue // Returns defaultValue if exists or undefined
      }
    }

    if (type !== "any") {
      if (typeof value !== type) {
        throw new AppContextError(
          `Parameter "${param.name}" expected to be a ${type} for stack "${this.stackConfig.shortStackName}" in ${this.appConfigPath}.`
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return value as any // Match return type as defined by GetConfigParameter
  }

  /**
   * Get a parameter from global configuration parameters
   */

  public getGlobalConfigParameter = (param: {
    name: string
    type: string
    required?: boolean
    defaultValue?: unknown
  }) => {
    const { name, type, required, defaultValue } = param
    const value = getConfigValue(this.appConfig.global, name)

    if (value === undefined) {
      if (required) {
        throw new AppContextError(
          `Parameter "${param.name}" is missing in global parameters of ${this.appConfigPath}.`
        )
      } else {
        return defaultValue // Returns defaultValue if exists or undefined
      }
    }

    if (type !== "any") {
      if (typeof value !== type) {
        throw new AppContextError(
          `Parameter "${param.name}" expected to be a ${type} in global parameters of ${this.appConfigPath}.`
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return value as any // Match return type as defined by GetConfigParameter
  }

  /**
   * Add function to warmup event schedule.
   * Expected to be called internally by createNodeJsFunction guardian
   */

  public addWarmUp(
    lambdaFunction: lambda.Function,
    options: WarmUpOptions
  ): void {
    const rule = this.getWarmUpRule()

    const { concurrency = 1, functionName = `${this.stackName}-*` } = options

    this.currentWarmUpTargetCount += 1
    this.addWarmUpTarget(rule, lambdaFunction, concurrency)

    // If concurrency is more then one then the function will invoke itself to warm up more instances
    if (concurrency > 1) {
      this.allowLambdaToInvokeItself(lambdaFunction, functionName)
    }
  }

  /**
   * Get CloudWatch Event rule for warm up events. Create a new rule if needed.
   */

  private getWarmUpRule(): events.Rule {
    if (this.needToCreateWarmUpRule()) {
      this.currentWarmUpRule = this.createWarmUpRule(this.warmUpRuleCount + 1)

      // Update counters
      this.warmUpRuleCount += 1
      this.currentWarmUpTargetCount = 0
    }

    assert(this.currentWarmUpRule, "Invalid warm up rule")
    return this.currentWarmUpRule
  }

  /**
   * Check if we need to create a new warm up rule
   */

  private needToCreateWarmUpRule() {
    return (
      this.currentWarmUpRule === undefined ||
      this.currentWarmUpTargetCount >= MAX_CLOUD_EVENT_RULE_TARGET_COUNT
    )
  }

  /**
   * Create new CloudWatch Events rule for warm up
   */

  private createWarmUpRule(index: number): events.Rule {
    const name = `warmup-${index}`

    return (this.currentWarmUpRule = new events.Rule(this, name, {
      ruleName: this.commonGuardian.createResourceName({
        baseName: name,
        resourceType: "rule",
      }),
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    }))
  }

  /**
   * Add warm up target to a CloudWatch Events rule
   */

  private addWarmUpTarget(
    rule: events.Rule,
    lambdaFunction: lambda.Function,
    concurrency: number
  ) {
    const event = events.RuleTargetInput.fromObject({
      warmer: true,
      concurrency: concurrency || 1,
    })

    rule.addTarget(new targets.LambdaFunction(lambdaFunction, { event }))
  }

  /**
   * Create policy to allow lambda function to invoke itself
   */

  private allowLambdaToInvokeItself(
    lambdaFunction: nodeLambda.NodejsFunction,
    functionName: string
  ) {
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [
          `arn:aws:lambda:${this.region}:${this.account}:function:${functionName}`,
          `arn:aws:lambda:${this.region}:${this.account}:function:${functionName}:*`,
        ],
      })
    )
  }

  protected createCommonHelper(): ICommonHelper {
    return new CommonHelper({
      construct: this,
      env: this.env,
      stackName: this.baseStackName, // Use base stack name for consistency
      stageName: this.stageName,
      appVersion: this.appVersion,
      stackType: this.stackType,
      projectPrefix: this.projectPrefix,
      variables: this.appContext.variables,
    })
  }

  protected createCommonGuardian(): ICommonGuardian {
    return new CommonGuardian({
      construct: this,
      env: this.env,
      stackName: this.baseStackName, // Use base stack name for resource naming
      stageName: this.stageName,
      appVersion: this.appVersion,
      stackType: this.stackType,
      projectPrefix: this.projectPrefix,
      variables: this.appContext.variables,
      commonCoerce: this.appContext,
    })
  }

  protected createServerlessImport(): IServerlessImport {
    return new ServerlessImport({
      construct: this,
      env: this.env,
      stackName: this.baseStackName, // Use base stack name for consistency
      stageName: this.stageName,
      appVersion: this.appVersion,
      stackType: this.stackType,
      projectPrefix: this.projectPrefix,
      commonCoerce: this.appContext,
    })
  }

  private static getEnvironment(
    appContext: AppContext,
    stackConfig: StackConfig
  ): cdk.Environment {
    /* Set custom region */

    if (stackConfig.updateRegionName) {
      // eslint-disable-next-line no-console
      console.log(
        `[INFO] Region is updated: ${stackConfig.name} ->> ${stackConfig.updateRegionName}`
      )
      return {
        region: stackConfig.updateRegionName,
        account: appContext.appConfig.project.account,
      }
    }

    return appContext.env
  }

  get cdkApp() {
    return this.appContext.cdkApp
  }

  get appConfig() {
    return this.appContext.appConfig
  }

  get appConfigPath() {
    return this.appContext.appConfigPath
  }

  get projectName() {
    return this.appContext.projectName
  }

  get projectPrefix() {
    return this.appContext.projectPrefix
  }

  get stageName() {
    return this.appContext.stageName
  }

  get appVersion() {
    return this.appContext.appVersion
  }

  get primaryRegion() {
    return this.appContext.primaryRegion
  }

  get projectRegions() {
    return this.appContext.projectRegions
  }

  coerceResourceName(name: string) {
    return this.appContext.coerceResourceName(name)
  }

  composeResourceName(params: ComposeResourceNameParams) {
    return this.appContext.composeResourceName(params)
  }

  composeStackName(params: ComposeStackNameParams): string {
    return this.appContext.composeStackName(params)
  }

  findEnumType<T extends object>(enumType: T, target: string): T[keyof T] {
    return this.commonHelper.findEnumType(enumType, target)
  }

  exportOutput(
    key: string,
    value: string,
    prefixEnable = true,
    prefixCustomName = ""
  ) {
    this.commonHelper.exportOutput(key, value, prefixEnable, prefixCustomName)
  }

  putParameter(
    paramKey: string,
    paramValue: string,
    prefixEnable = true,
    prefixCustomName = ""
  ): string {
    return this.commonHelper.putParameter(
      paramKey,
      paramValue,
      prefixEnable,
      prefixCustomName
    )
  }

  getParameter(
    paramKey: string,
    prefixEnable = true,
    prefixCustomName = ""
  ): string {
    return this.commonHelper.getParameter(
      paramKey,
      prefixEnable,
      prefixCustomName
    )
  }

  putVariable(variableKey: string, variableValue: string) {
    this.commonHelper.putVariable(variableKey, variableValue)
  }

  getVariable(variableKey: string): string {
    return this.commonHelper.getVariable(variableKey)
  }

  /**
   * @deprecated Use function resourceName(scope, name, type)
   */

  createResourceName(name: string | ResourceNameParams, type?: string): string {
    if (typeof name === "string") {
      return this.commonGuardian.createResourceName(name, type)
    } else if (typeof name === "object") {
      const params = name
      return this.commonGuardian.createResourceName(params)
    } else throw new Error("createResourceName: invalid parameters")
  }

  /**
   * @deprecated Use CDK Bucket construct
   */

  createS3Bucket(baseName: string, options?: CreateBucketOptions): s3.Bucket {
    return this.commonGuardian.createS3Bucket(baseName, options)
  }

  /**
   * Helper to create Node.js lambda function
   *
   * @deprecated Use new NodeJsFunctionSimplePattern()
   */

  createNodeJsFunction(
    baseName: string,
    options: CreateNodeLambdaFunctionOptions
  ): nodeLambda.NodejsFunction {
    return this.commonGuardian.createNodeJsFunction(baseName, options)
  }

  lambdaFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.lambdaFromServerless(ref)
  }

  dynamoDbTableFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.dynamoDbTableFromServerless(ref)
  }

  snsTopicFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.snsTopicFromServerless(ref)
  }

  sqsQueueFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.sqsQueueFromServerless(ref)
  }

  sqsDeadLetterQueueFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.sqsDeadLetterQueueFromServerless(ref)
  }

  s3BucketFromServerless(ref: ServerlessResourceRef) {
    return this.serverlessImport.s3BucketFromServerless(ref)
  }
}

/**
 * Get value from configuration. Use dot notation get get property of an object
 * @example
 * ```typescript
 * const value = getConfigValue(Config, "obj.property")
 * ```
 */

function getConfigValue(config: unknown, name: string): unknown {
  if (typeof config === "object") {
    const path = name.split(".")

    // Traverse properties of config object

    let value = config

    for (const prop of path) {
      if (typeof value === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value = (value as any)[prop]
      } else {
        return undefined
      }
    }

    return value
  } else {
    return undefined
  }
}
