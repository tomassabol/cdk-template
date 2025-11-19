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
import * as s3 from "aws-cdk-lib/aws-s3"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"

import { StackType } from "../app-config"
import { ICommonCoerce } from "./common-coerce"
import { IBaseConstruct } from "../construct/base/base-construct-interface"
import { WarmUpOptions } from "../stack/base/base-stack-interface"

export interface ICommonGuardian {
  /**
   * Create standard resource name
   *
   * @deprecated Use function resourceName(scope, name, type)
   */

  createResourceName(params: ResourceNameParams): string

  /**
   * Create standard resource name
   *
   * @deprecated Use function resourceName(scope, name, type)
   */

  createResourceName(name: string, type?: string): string

  /**
   * Helper to create standard bucket
   *
   * @deprecated Use CDK Bucket construct
   */

  createS3Bucket(baseName: string, options?: CreateBucketOptions): s3.Bucket

  /**
   * Create Node.js lambda function. The function code should export a function "handler"
   *
   * @example
   * ```typescript
   * this.createNodeJsFunction("my function", {
   *   entry: "src/functions/my-function.ts",
   *   description: "My example function",
   * }
   * ```
   *
   * @deprecated Use NodeJsFunctionSimplePattern construct
   */

  createNodeJsFunction(
    baseName: string,
    options: CreateNodeLambdaFunctionOptions
  ): nodeLambda.NodejsFunction
}

export interface CommonGuardianProps {
  stackName: string
  stageName: string
  projectPrefix: string
  construct: IBaseConstruct
  env: cdk.Environment
  variables: Record<string, string>
  appVersion?: string
  stackType: StackType
  commonCoerce: ICommonCoerce
}

export class CommonGuardian implements ICommonGuardian {
  protected props: CommonGuardianProps
  protected stackName: string
  protected projectPrefix: string
  protected commonCoerce: ICommonCoerce

  constructor(props: CommonGuardianProps) {
    this.props = props
    this.stackName = props.stackName
    this.projectPrefix = props.projectPrefix
    this.commonCoerce = props.commonCoerce
  }

  /**
   * Create standardized resource name
   *
   * @deprecated Use function resourceName(scope, name, type)
   */

  createResourceName(name: string | ResourceNameParams, type?: string): string {
    const { stackName } = this.props
    if (typeof name === "object" && type === undefined) {
      const params = name
      return this.props.commonCoerce.composeResourceName({
        ...params,
        stackName,
      })
    } else if (typeof name === "string") {
      return this.props.commonCoerce.composeResourceName({
        baseName: name,
        resourceType: type,
        stackName,
      })
    } else throw new Error("createResourceName: invalid parameters")
  }

  createS3Bucket(
    baseName: string,
    options: CreateBucketOptions = {}
  ): s3.Bucket {
    const bucketName = this.createResourceName({
      baseName,
      resourceType: "bucket",
    })

    const s3Bucket = new s3.Bucket(this.props.construct, `${baseName}-bucket`, {
      bucketName,
      encryption: s3.BucketEncryption.UNENCRYPTED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      ...options,
    })

    return s3Bucket
  }

  /**
   * Helper to create Node.js lambda function
   *
   * @deprecated Use NodeJsFunctionSimplePattern
   */

  createNodeJsFunction(
    baseName: string,
    {
      functionName = this.createResourceName({
        baseName,
        resourceType: "function",
      }),
      memorySize = 1024,
      timeout = cdk.Duration.seconds(5),
      runtime = lambda.Runtime.NODEJS_16_X, // TODO: change to NODEJS_22_X
      handler = "handler",
      logRetention = logs.RetentionDays.THREE_MONTHS,
      logGroup,
      warmUp = false,
      ...options
    }: CreateNodeLambdaFunctionOptions
  ) {
    const resolvedLogGroup =
      logGroup ??
      new logs.LogGroup(this.props.construct, `${baseName}LogGroup`, {
        logGroupName: `/aws/lambda/${functionName}`,
        retention: logRetention,
      })

    const lambdaFunction = new nodeLambda.NodejsFunction(
      this.props.construct,
      baseName,
      {
        memorySize,
        functionName,
        timeout,
        runtime,
        handler,
        logGroup: resolvedLogGroup,
        ...options,
      }
    )

    if (warmUp) {
      const options = {
        concurrency: 1,
        ...(typeof warmUp === "object" && warmUp),
        functionName,
      }
      this.props.construct.stack.addWarmUp(lambdaFunction, options)
    }

    return lambdaFunction
  }
}

export type ResourceNameParams = {
  baseName: string
  resourceType: string
}

export type CreateBucketOptions = s3.BucketProps & {
  /** Optional bucket name, it is preferred to use generated bucket name */
  bucketName?: string
  /** Bucket encryption */
  encryption?: s3.BucketEncryption
  /** Bucket versioning */
  versioned?: boolean
}
export type CreateNodeLambdaFunctionOptions = nodeLambda.NodejsFunctionProps & {
  warmUp?: boolean | WarmUpOptions
}
