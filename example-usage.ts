import { AppContext, AppContextError } from "./lib"
import { BaseStack } from "./lib/template/stack/base/base-stack"

try {
  const appContext = new AppContext()
  BaseStack.fromAppContext(appContext, "stack1")
} catch (error) {
  if (error instanceof AppContextError) {
    console.error("[AppContextError]:", error.message)
  } else {
    console.error(error)
  }
}
