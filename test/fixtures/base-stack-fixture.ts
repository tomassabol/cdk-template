import assert from "assert"
import { BaseStack } from "../../lib/template/stack/base/base-stack"
import { createAppContextFixture } from "./app-context-fixture"

export function createBaseStackFixture(): BaseStack {
  const appContext = createAppContextFixture()
  const stack = BaseStack.fromAppContext(appContext, "stack1")
  assert(stack, "Cannot create base stack fixture")
  return stack
}
