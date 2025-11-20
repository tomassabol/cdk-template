import assert from "assert"
import { BaseStack } from "../../lib/template/stack/base/base-stack"
import { createAppContextFixture } from "./app-context-fixture"

export function createBaseStackFixture(): BaseStack {
  const appContext = createAppContextFixture()
  const stacks = BaseStack.fromAppContext(appContext, "stack1")
  assert(stacks.length > 0, "Cannot create base stack fixture")
  return stacks[0] // Return first stack for backward compatibility
}
