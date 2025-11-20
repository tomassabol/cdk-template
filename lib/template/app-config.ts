import { readFileSync } from "fs"

// This file was adopted from https://github.com/aws-samples/aws-cdk-project-template-for-devops

/**
 * Structure of app config json file
 */

export interface AppConfig {
  /** Config file version. @default "1" */
  configVersion?: string
  /** Project configuration */
  project: ProjectConfig
  /** Any kind of global configuration */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global?: any
  /** Configurations for all stacks */
  stacks: Record<string, StackConfig>
}

/**
 * Project configuration structure of app config json file
 */

export interface ProjectConfig {
  /** Project name */
  name: string
  /** Stage name e.g. "prod" */
  stage: string
  /** Application version e.g. "v1" */
  version?: string
  /** AWS Account number */
  account?: string
  /**
   * AWS Regions where the project is deployed. The first entry is treated as
   * the primary region.
   */
  regions?: string[]
  /** @deprecated Use regions instead */
  region?: string
  /** AWS Profile name, not used in CDK but can be extracted by deployment script */
  profile?: string
}

/**
 * Stack configuration structure of app config json file
 */

export interface StackConfig {
  /** Stack name to be used in CloudFormation */
  name: string
  /** Short stack name stores original stack Name value before prefixing stack name with project and version */
  shortStackName?: string
  /** Base stack name without region suffix (for resource naming) */
  baseStackName?: string
  /** Optionally the deployment can be disabled by setting Deploy to false */
  deploy?: boolean
  /** Override region with provided value */
  updateRegionName?: string
  /** Type of stack, default is VERSIONED */
  stackType?: StackType
  /** Any other configuration parameters */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: any
}

/**
 * Stack type:
 * - VERSIONED - Allows to manage different versions of the stack
 * - SHARED - Stack shared by all versions of other stacks
 * - GLOBAL - Stack deployed on the account level, does not depend on stage
 */

export type StackType = "VERSIONED" | "SHARED" | "GLOBAL"

/**
 * Read and parse AppConfig from file
 */

export function getAppConfigFromFile(appConfigPath: string): AppConfig {
  try {
    return JSON.parse(readFileSync(appConfigPath).toString())
  } catch (error) {
    throw new Error(`Cannot read app config from ${appConfigPath}: ${error}`)
  }
}
