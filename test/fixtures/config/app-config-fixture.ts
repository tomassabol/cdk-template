import { AppConfig } from "../../../lib/template/app-config"
import fixture from "./app-config-example-dev.json"

export const APP_CONFIG_FIXTURE_PATH =
  "test/fixtures/config/app-config-example-dev.json"

export const APP_CONFIG_FIXTURE_PATH_PATTERN =
  "test/fixtures/config/app-config-example-${STAGE}.json"

export function createAppConfigFixture(
  options: { configVersion?: string } = {}
): AppConfig {
  // const copy = JSON.parse(JSON.stringify(fixture)) as AppConfig
  return { ...fixture, ...options }
}
