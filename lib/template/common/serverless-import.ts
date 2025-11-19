import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as dynamoDb from "aws-cdk-lib/aws-dynamodb"
import * as sns from "aws-cdk-lib/aws-sns"
import * as sqs from "aws-cdk-lib/aws-sqs"
import { Construct } from "constructs"
import { ICommonCoerce } from "./common-coerce"
import { StackType } from "../app-config"

export interface IServerlessImport {
  lambdaFromServerless(ref: ServerlessResourceRef): lambda.IFunction
  dynamoDbTableFromServerless(ref: ServerlessResourceRef): dynamoDb.ITable
  snsTopicFromServerless(ref: ServerlessResourceRef): sns.ITopic
  sqsQueueFromServerless(ref: ServerlessResourceRef): sqs.IQueue
  sqsDeadLetterQueueFromServerless(ref: ServerlessResourceRef): sqs.IQueue
  s3BucketFromServerless(ref: ServerlessResourceRef): s3.IBucket
}

export interface ServerlessImportProps {
  stackName: string
  stageName: string
  projectPrefix: string
  construct: Construct
  env: cdk.Environment
  appVersion?: string
  stackType: StackType
  commonCoerce: ICommonCoerce
}

export type ServerlessResourceRef = {
  /** Optional construct name, if undefined then baseName is used */
  id?: string
  /** Base name of the resource in serverless stack e.g. "packages" */
  baseName: string
  /** Base name of the serverless stack, e.g. "api" */
  stackName: string
  /** Optional api version, if undefined then current version is used */
  appVersion?: string
  /** Type of stack */
  stackType?: StackType
}

/**
 * Helper to import resources from legacy tomassabol stacks created using serverless framework.
 *
 * It is required that the imported resources follow the same resource naming convention as defined in tomassabol project.
 */

export class ServerlessImport implements IServerlessImport {
  protected props: ServerlessImportProps

  constructor(props: ServerlessImportProps) {
    this.props = props
  }

  lambdaFromServerless(ref: ServerlessResourceRef): lambda.IFunction {
    return lambda.Function.fromFunctionName(
      this.props.construct,
      ref.id || ref.baseName,
      this.getServerlessResourceName({
        ...ref,
        resourceType: "function",
      })
    )
  }

  dynamoDbTableFromServerless(ref: ServerlessResourceRef): dynamoDb.ITable {
    return dynamoDb.Table.fromTableName(
      this.props.construct,
      ref.id || ref.baseName,
      this.getServerlessResourceName({
        stackType: "SHARED", // Usually the tables are in a shared stack
        ...ref,
        resourceType: "table",
      })
    )
  }

  snsTopicFromServerless(ref: ServerlessResourceRef): sns.ITopic {
    return sns.Topic.fromTopicArn(
      this.props.construct,
      ref.id || ref.baseName,
      `arn:aws:sns:${this.props.env.region}:${
        this.props.env.account
      }:${this.getServerlessResourceName({
        ...ref,
        resourceType: "topic",
      })}`
    )
  }

  sqsQueueFromServerless(ref: ServerlessResourceRef): sqs.IQueue {
    return sqs.Queue.fromQueueArn(
      this.props.construct,
      ref.id || ref.baseName,
      `arn:aws:sqs:${this.props.env.region}:${
        this.props.env.account
      }:${this.getServerlessResourceName({
        ...ref,
        resourceType: "queue",
      })}`
    )
  }

  sqsDeadLetterQueueFromServerless(ref: ServerlessResourceRef): sqs.IQueue {
    return sqs.Queue.fromQueueArn(
      this.props.construct,
      ref.id || ref.baseName,
      `arn:aws:sqs:${this.props.env.region}:${
        this.props.env.account
      }:${this.getServerlessResourceName({
        ...ref,
        resourceType: "dlq",
      })}`
    )
  }

  s3BucketFromServerless(ref: ServerlessResourceRef): s3.IBucket {
    return s3.Bucket.fromBucketName(
      this.props.construct,
      ref.id || ref.baseName,
      this.getServerlessResourceName({
        stackType: "SHARED", // Usually the buckets are in a shared stack
        ...ref,
        resourceType: "bucket",
      })
    )
  }

  private getServerlessResourceName(
    ref: ServerlessResourceRef & { resourceType: string }
  ) {
    const {
      baseName,
      stackName,
      appVersion = this.props.appVersion,
      stackType = "VERSIONED",
      resourceType,
    } = ref

    const fullStackName = this.props.commonCoerce.composeStackName({
      projectPrefix: this.props.projectPrefix,
      stackName,
      stageName: this.props.stageName,
      appVersion,
      stackType,
    })

    return this.props.commonCoerce.composeResourceName({
      baseName,
      resourceType,
      stackName: fullStackName,
    })
  }
}
