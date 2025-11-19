import { AppContext } from "../../lib/template/app-context"
import {
  APP_CONFIG_FIXTURE_PATH,
  createAppConfigFixture,
} from "./config/app-config-fixture"

/**
 * Create AppContext fixture
 */

export function createAppContextFixture(options: { stage?: string } = {}) {
  if (options.stage) {
    const appConfig = createAppConfigFixture()
    const { project } = appConfig
    project.stage = options.stage
    return new AppContext({ appConfig, enableOutput: false })
  } else {
    process.env.APP_CONFIG = APP_CONFIG_FIXTURE_PATH
    return new AppContext({ enableOutput: false })
  }
}
