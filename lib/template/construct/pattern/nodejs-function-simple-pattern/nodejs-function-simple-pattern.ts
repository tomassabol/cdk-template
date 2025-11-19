import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs"
import { WarmUpOptions } from "../../../stack/base/base-stack-interface"
import { defaultNodeJsFunctionSimplePatternProps } from "./default-props"
import { Construct } from "constructs"
import { baseStackOf } from "../../../common/common-utils"

export type NodeJsFunctionSimplePatternProps =
  nodeLambda.NodejsFunctionProps & {
    /**
     * Enable or configure warm up for lambda
     *
     * @default false
     */
    warmUp?: boolean | WarmUpOptions
    /**
     * Include lambda powertools layer
     *
     * @default true
     */
    powertoolsLayer?: boolean
  }

/**
 * Simple pattern for Node.js Lambda function
 *
 * @example
 * ```typescript
 * const { lambdaFunction } = new NodeJsFunctionSimplePattern(this, "my-function", {
 *   entry: "src/functions/my-function.ts"
 * })
 * ```
 *
 * Default props setting:
 * - functionName: project default name (e.g. project-stack-version-stage-name-function)
 * - runtime: NODEJS_22_X
 * - memorySize: 1024
 * - timeout: 10s
 * - log group retention: 3 months
 * - bundling.sourceMap: true
 * - bundling.externalModules: \@aws-sdk / aws-sdk (depending on runtime), \@aws-lambda-powertools if powertoolsLayer is true
 * - environment: STAGE variable
 * - tracing: Active
 * - warmup: 1 instance for production, no warmup for others
 * - powertoolsLayer: true
 */

export class NodeJsFunctionSimplePattern extends Construct {
  public lambdaFunction: nodeLambda.NodejsFunction
  constructor(
    scope: Construct,
    id: string,
    props: NodeJsFunctionSimplePatternProps
  ) {
    super(scope, id)

    const stack = baseStackOf(scope)

    const {
      warmUp,
      powertoolsLayer,
      layers = [],
      functionName = id,
      ...restProps
    } = defaultNodeJsFunctionSimplePatternProps(scope, id, props)

    if (powertoolsLayer) {
      layers.push(stack.powertoolsLayer)
    }

    const lambdaFunction = new nodeLambda.NodejsFunction(this, id, {
      functionName,
      layers,
      ...restProps,
    })

    this.lambdaFunction = lambdaFunction

    if (warmUp) {
      const options = {
        concurrency: 1,
        ...(typeof warmUp === "object" && warmUp),
        functionName,
      }

      stack.addWarmUp(lambdaFunction, options)
    }
  }
}
