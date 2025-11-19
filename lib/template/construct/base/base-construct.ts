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

import * as s3 from "aws-cdk-lib/aws-s3"
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import { Construct } from "constructs"

import {
  CreateBucketOptions,
  CreateNodeLambdaFunctionOptions,
  ResourceNameParams,
} from "../../common/common-guardian"
import { ServerlessResourceRef } from "../../common/serverless-import"
import {
  ComposeResourceNameParams,
  ComposeStackNameParams,
} from "../../common/common-coerce"
import { IBaseConstruct } from "./base-construct-interface"
import { IBaseStack } from "../../stack/base/base-stack-interface"

/**
 * Construct base for deriving other constructs
 */

export class BaseConstruct extends Construct implements IBaseConstruct {
  /** Reference to stack owning the construct */
  public readonly stack: IBaseStack

  constructor(scope: IBaseConstruct, id: string) {
    const { stack } = scope

    if (stack === undefined) {
      throw new Error(
        "BaseConstruct scope must be a BaseStack or BaseConstruct"
      )
    }

    super(scope, id)
    this.stack = stack
  }

  public getStackConfig() {
    return this.stack.stackConfig
  }

  public get stackName() {
    return this.stack.stackName
  }

  public get stageName() {
    return this.stack.stageName
  }

  get projectName() {
    return this.stack.projectName
  }

  public get projectPrefix() {
    return this.stack.projectPrefix
  }

  public get appVersion() {
    return this.stack.appVersion
  }

  public get stackType() {
    return this.stack.stackType
  }

  public get stackConfig() {
    return this.stack.stackConfig
  }

  get appContext() {
    return this.stack.appContext
  }

  get cdkApp() {
    return this.stack.cdkApp
  }

  get appConfig() {
    return this.stack.appConfig
  }

  get primaryRegion() {
    return this.stack.primaryRegion
  }

  get projectRegions() {
    return this.stack.projectRegions
  }

  get appConfigPath() {
    return this.stack.appConfigPath
  }

  get env() {
    return this.stack.env
  }

  get getStackConfigParameter() {
    return this.stack.getStackConfigParameter
  }

  get getGlobalConfigParameter() {
    return this.stack.getGlobalConfigParameter
  }

  coerceResourceName(name: string) {
    return this.stack.coerceResourceName(name)
  }

  composeResourceName(params: ComposeResourceNameParams) {
    return this.stack.composeResourceName(params)
  }

  composeStackName(params: ComposeStackNameParams): string {
    return this.stack.composeStackName(params)
  }

  findEnumType<T extends object>(enumType: T, target: string): T[keyof T] {
    return this.stack.findEnumType(enumType, target)
  }

  exportOutput(key: string, value: string) {
    this.stack.exportOutput(key, value)
  }

  putParameter(paramKey: string, paramValue: string): string {
    return this.stack.putParameter(paramKey, paramValue)
  }

  getParameter(paramKey: string): string {
    return this.stack.getParameter(paramKey)
  }

  putVariable(variableKey: string, variableValue: string) {
    this.stack.putVariable(variableKey, variableValue)
  }

  getVariable(variableKey: string): string {
    return this.stack.getVariable(variableKey)
  }

  /**
   * @deprecated Use function resourceName(scope, name, type)
   */

  createResourceName(name: string | ResourceNameParams, type?: string): string {
    if (typeof name === "string") {
      return this.stack.createResourceName(name, type)
    } else if (typeof name === "object") {
      const params = name
      return this.stack.createResourceName(params)
    } else throw new Error("createResourceName: invalid parameters")
  }

  /**
   * @deprecated Use CDK Bucket construct
   */

  createS3Bucket(baseName: string, options?: CreateBucketOptions): s3.Bucket {
    return this.stack.createS3Bucket(baseName, options)
  }

  /**
   * Helper to create Node.js lambda function
   *
   * @deprecated Use NodeJsFunctionSimplePattern
   */

  createNodeJsFunction(
    baseName: string,
    options: CreateNodeLambdaFunctionOptions
  ): nodeLambda.NodejsFunction {
    return this.stack.createNodeJsFunction(baseName, options)
  }

  lambdaFromServerless(ref: ServerlessResourceRef) {
    return this.stack.lambdaFromServerless(ref)
  }

  dynamoDbTableFromServerless(ref: ServerlessResourceRef) {
    return this.stack.dynamoDbTableFromServerless(ref)
  }

  snsTopicFromServerless(ref: ServerlessResourceRef) {
    return this.stack.snsTopicFromServerless(ref)
  }

  sqsQueueFromServerless(ref: ServerlessResourceRef) {
    return this.stack.sqsQueueFromServerless(ref)
  }

  sqsDeadLetterQueueFromServerless(ref: ServerlessResourceRef) {
    return this.stack.sqsDeadLetterQueueFromServerless(ref)
  }

  s3BucketFromServerless(ref: ServerlessResourceRef) {
    return this.stack.s3BucketFromServerless(ref)
  }
}
