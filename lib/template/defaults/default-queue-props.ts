import * as cdk from "aws-cdk-lib"
import * as sqs from "aws-cdk-lib/aws-sqs"
import { Construct } from "constructs"
import { resourceName } from "../common/common-utils"
import { withDefaultOptionalPropsFactory } from "./with-default-props-factory"

/**
 * Create default props for S3 Bucket.
 *
 * @example
 * ```typescript
 * const queue = new sqs.Queue(
 *   this, id, defaultQueueProps(this, id, { ... }))
 * )
 * ```
 */

export const defaultQueueProps = (
  scope: Construct,
  id: string,
  props?: Partial<sqs.QueueProps>
): Partial<sqs.QueueProps> => {
  const queueName = resourceName(scope, id, "queue")

  return {
    queueName,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    ...props,
  }
}

/**
 * Create args with default props for S3 Bucket.
 * Syntactic sugar for defaultQueueProps.
 *
 * Default props:
 *
 * - queueName: standardized name
 * - removalPolicy: DESTROY
 *
 * @example
 * ```typescript
 * const queue = new sqs.Queue(...withDefaultQueueProps(this, id, { ... } ))
 * )
 * ```
 */

export const withDefaultQueueProps =
  withDefaultOptionalPropsFactory(defaultQueueProps)
