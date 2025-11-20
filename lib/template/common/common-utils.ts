import { Construct } from "constructs"
import { BaseStack } from "../stack/base/base-stack"
import { AppContext } from "../app-context"

/**
 * Get the base stack of a construct
 */

export function baseStackOf(scope: Construct): BaseStack {
  return BaseStack.of(scope)
}

/**
 * Get app context of a construct
 */

export function appContextOf(scope: Construct): AppContext {
  return BaseStack.of(scope).appContext
}

/**
 * Return stage name of a construct (e.g. "prod", "test", ...)
 */

export function stageOf(scope: Construct): string {
  return BaseStack.of(scope).stageName
}

/**
 * Create standard resource name
 */

export function resourceName(scope: Construct, name: string, type: string) {
  const stack = BaseStack.of(scope)
  const { appContext } = stack

  return appContext.composeResourceName({
    baseName: name,
    resourceType: type,
    stackName: stack.baseStackName, // Use base stack name without region suffix
  })
}
