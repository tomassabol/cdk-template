import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import { Construct } from "constructs"
import { resourceName, stageOf } from "../common/common-utils"
import { withDefaultPropsFactory } from "./with-default-props-factory"

/**
 * Default props for NodeJsFunctionSimplePattern
 */

export const DEFAULT_FUNCTION_LOG_RETENTION = logs.RetentionDays.THREE_MONTHS

export const defaultFunctionProps = (
  scope: Construct,
  id: string,
  props: lambdaNJS.NodejsFunctionProps
): lambdaNJS.NodejsFunctionProps => {
  const stage = stageOf(scope)

  const {
    bundling = {},
    environment,
    runtime = lambda.Runtime.NODEJS_22_X,
    logRetention,
    logGroup,
    functionName,
    ...restProps
  } = props

  const resolvedFunctionName =
    functionName ?? resourceName(scope, id, "function")

  const { externalModules = [], ...restBundling } = bundling

  if (runtime === lambda.Runtime.NODEJS_22_X) {
    externalModules.push("@aws-sdk") // AWS SDK V3
  } else {
    externalModules.push("aws-sdk") // AWS SDK V2
  }

  return {
    functionName: resolvedFunctionName,

    runtime,

    /**
     * CPU is allocated based on memory size so we want to increase it to a reasonable value
     */
    memorySize: 1024,

    /**
     * NOTE: Time out must be set accordingly to timeout of HTTP requests in lambda functions
     */
    timeout: cdk.Duration.seconds(10),

    /**
     * Retention for log groups
     */
    logGroup:
      logGroup ??
      new logs.LogGroup(scope, `${id}LogGroup`, {
        logGroupName: `/aws/lambda/${resolvedFunctionName}`,
        retention: logRetention ?? DEFAULT_FUNCTION_LOG_RETENTION,
      }),

    /**
     * Bundling options (esbuild)
     */
    bundling: {
      sourceMap: true,
      externalModules: [...new Set(externalModules)],
      ...restBundling,
    },

    /**
     * Default environment variables
     */
    environment: {
      STAGE: stage,
      ...environment,
    },

    /**
     * Enable X-Ray tracing
     */
    tracing: lambda.Tracing.ACTIVE,

    ...restProps,
  }
}

/**
 * Create args with default props for NodeJSLambda
 *
 * **Note**: NodeJsFunctionSimplePattern construct is preferred when creating Lambda function and it contains all these defaults.
 *
 * Default props setting:
 * - functionName: project default name (e.g. project-stack-version-stage-name-function)
 * - runtime: NODEJS_22_X
 * - memorySize: 1024
 * - timeout: 10s
 * - log group retention: 3 months
 * - bundling.sourceMap: true
 * - bundling.externalModules: \@aws-sdk if runtime is NODEJS_22_X, aws-sdk otherwise
 * - environment: STAGE variable
 * - tracing: Active
 *
 * @example
 *
 * ```ts
 * const lambdaFunction = new nodejs.Function(...withDefaultNodeJsFunctionProps(scope, id, { ... }))
 * ```
 */
export const withDefaultFunctionProps =
  withDefaultPropsFactory(defaultFunctionProps)
