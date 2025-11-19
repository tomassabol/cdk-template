import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { IBaseConstruct } from "../../construct/base/base-construct-interface"
import { AppContext } from "../../app-context"

/**
 * Base class for stacks
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IBaseStack extends IBaseConstruct, cdk.Stack {
  readonly appContext: AppContext
  addWarmUp(handler: lambda.Function, options: WarmUpOptions): void
}

/**
 * Options for lambda warming up
 */

export type WarmUpOptions = {
  functionName?: string
  concurrency?: number
}
