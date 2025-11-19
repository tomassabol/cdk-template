import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import { Construct } from "constructs"
import { resourceName, stageOf } from "../common/common-utils"
import { withDefaultPropsFactory } from "./with-default-props-factory"

/**
 * Create default props for DynamoDB Table
 *
 * @example
 * ```ts
 * const table = new dynamodb.Table(
 *   scope, id, defaultDynamoDbTableProps(this, id, { partitionKey: ... })
 * )
 * ```
 */

export const defaultTableProps = (
  scope: Construct,
  id: string,
  props: dynamodb.TableProps
): dynamodb.TableProps => {
  const defaultOptions: Partial<dynamodb.TableProps> = {
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  }

  const stageOptions: Record<string, Partial<dynamodb.TableProps>> = {
    prod: {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      tableName: resourceName(scope, id, "table"),
    },
    test: {
      tableName: resourceName(scope, id, "table"),
    },
  }

  return {
    ...defaultOptions,
    ...stageOptions[stageOf(scope)],
    ...props,
  }
}

/**
 * Create args with default props for DynamoDB Table.
 * Syntactic sugar for defaultTableProps.
 *
 * Default props:
 *
 * - tableName: standardized name for production/test environment; CDK generated name otherwise
 * - billingMode: PAY_PER_REQUEST
 * - removalPolicy: RETAIN for production, DESTROY otherwise
 * - pointInTimeRecovery: true for production
 *
 * @example
 * ```typescript
 * const table = new dynamodb.Table(...withDefaultTableProps(this, id, { partitionKey: ... }))
 * ```
 */

export const withDefaultTableProps = withDefaultPropsFactory(defaultTableProps)
