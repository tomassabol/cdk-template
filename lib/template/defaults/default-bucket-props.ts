import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"
import { Construct } from "constructs"
import { resourceName, stageOf } from "../common/common-utils"
import { withDefaultOptionalPropsFactory } from "./with-default-props-factory"

/**
 * Create default props for S3 Bucket.
 *
 * @example
 * ```typescript
 * const bucket = new s3.Bucket(
 *   scope, id, defaultBucketProps(this, id, { ... }))
 * )
 * ```
 */

export const defaultBucketProps = (
  scope: Construct,
  id: string,
  props?: Partial<s3.BucketProps>
): Partial<s3.BucketProps> => {
  const isProduction = stageOf(scope) === "prod"

  const bucketName = resourceName(scope, id, "bucket")

  const removalPolicy = isProduction
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY

  const autoDeleteObjects =
    removalPolicy === cdk.RemovalPolicy.DESTROY ? true : false

  return {
    bucketName,
    removalPolicy,
    autoDeleteObjects,
    ...props,
  }
}

/**
 * Create args for with default props for S3 Bucket.
 * Syntactic sugar for defaultBucketProps.
 *
 * Default props:
 *
 * - bucketName: standardized name
 * - removalPolicy: RETAIN for production, DESTROY otherwise
 * - autoDeleteObjects: true (applied only when removalPolicy is DESTROY)
 *
 * @example
 * ```typescript
 * const bucket = new s3.Bucket(...withDefaultBucketProps(this, id, { ... }))
 * ```
 */

export const withDefaultBucketProps =
  withDefaultOptionalPropsFactory(defaultBucketProps)
