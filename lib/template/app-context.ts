/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// This file was adopted from https://github.com/aws-samples/aws-cdk-project-template-for-devops

import assert from "assert"
import * as fs from "fs"
import * as cdk from "aws-cdk-lib"
import { AppConfig, ProjectConfig, StackType } from "./app-config"
import {
  CommonCoerce,
  ComposeResourceNameParams,
  ComposeStackNameParams,
  ICommonCoerce,
} from "./common/common-coerce"
import { CommonCoerceV2 } from "./common/common-coerce-v2"
import { findEnvVars, replaceEnvVar } from "./utils/env-var-substitution"
import { traverseObject } from "./utils/traverse-object"
import { deepCopyJSON } from "./utils/deep-copy-json"

export class AppContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppConfigFileFailError"
  }
}

export type AppContextProps = {
  /** Environment variable or context variable to get location of config file. @default "APP_CONFIG" */
  appConfigEnvVarName?: string
  /** Alternative file pattern to determine config file from STAGE context variable. @default "infra/config/app-config-${STAGE}.json" */
  appConfigFilePattern?: string
  /** Default stage name to be used if context does not contain STAGE variable. If not specified then the stage is taken from environment STAGE or DEFAULT_STAGE */
  defaultStage?: string
  /** List of context variables to be used to override to app configuration e.g. [ "stacks.myStack.reservedConcurrency" ] */
  contextArgs?: string[]
  /** Enable output of information and errors to console, @default true */
  enableOutput?: boolean
  /** Direct input AppConfig file (e.g. for testing) */
  appConfig?: AppConfig
  /** Prefix for default tags, e.g. "cdk:", default is no prefix */
  tagPrefix?: string
}

export interface IAppContext extends ICommonCoerce {
  /** Version of configuration file */
  readonly configVersion?: string
  /** Instance of CDK Application */
  readonly cdkApp: cdk.App
  /** App configuration file data */
  readonly appConfig: AppConfig
  /** App configuration file name */
  readonly appConfigPath: string
  /** Stage name */
  readonly stageName: string
  /** Project name  */
  readonly projectName: string
  /** Prefixed project name */
  readonly projectPrefix: string
  /** App version */
  readonly appVersion?: string
  /** App environment (AWS region and account) */
  readonly env: cdk.Environment
  /** Primary AWS region for stacks without region overrides */
  readonly primaryRegion: string
  /** Ordered list of AWS regions configured for the project */
  readonly projectRegions: string[]
}

export class AppContext implements IAppContext {
  public readonly cdkApp: cdk.App
  public readonly appConfig: AppConfig
  public readonly appConfigPath: string
  public readonly projectName: string
  public readonly projectPrefix: string
  public readonly appVersion?: string
  public readonly stageName: string
  public readonly env: cdk.Environment
  public readonly primaryRegion: string
  public readonly projectRegions: string[]
  /** Version of configuration file */
  public readonly configVersion?: string
  public readonly tagPrefix?: string

  /** Variables shared between stacks */
  public readonly variables: Record<string, string>

  private readonly commonCoerce: ICommonCoerce

  private enableOutput?: boolean

  private static defaultProps: Partial<AppContextProps> = {
    appConfigEnvVarName: "APP_CONFIG",
    appConfigFilePattern: "infra/config/app-config-${STAGE}.json",
    enableOutput: true,
  }

  private static defaultConfigVersion = "1"

  private static validConfigVersions = ["1", "2"]

  constructor(props: AppContextProps = {}) {
    // eslint-disable-next-line no-param-reassign
    props = { ...AppContext.defaultProps, ...props }

    this.cdkApp = new cdk.App()
    this.enableOutput = props.enableOutput
    this.tagPrefix = props.tagPrefix

    /**
     * Stage name to be used for selection of app config
     */
    const stageForAppConfig =
      this.getStageFromCdkContext() ||
      props.defaultStage ||
      AppContext.getStageFromEnvironment()

    try {
      const {
        config: originalConfig,
        appConfigPath,
        appConfigSource: appConfigSourceType,
      } = this.loadAppConfig(props, stageForAppConfig)

      this.configVersion = this.validateConfigVersion(
        originalConfig.configVersion || AppContext.defaultConfigVersion
      )
      this.commonCoerce = this.createCommonCoerce(this.configVersion)

      const validateOptions = {
        stageForAppConfig,
        appConfigSourceType,
      }

      const appConfig = this.validateAppConfig(
        this.processAppConfig(originalConfig, props.contextArgs),
        validateOptions
      )

      this.appConfig = appConfig
      this.appConfigPath = appConfigPath
      this.appVersion = appConfig.project.version
      this.stageName = appConfig.project.stage
      this.projectName = appConfig.project.name
      this.projectPrefix = this.getProjectPrefix(appConfig)
      const projectRegions = this.resolveProjectRegions(appConfig.project)
      this.projectRegions = projectRegions
      this.primaryRegion = projectRegions[0]
      this.appConfig.project.regions = projectRegions
      this.appConfig.project.region = this.primaryRegion
      this.env = {
        account: this.appConfig.project.account,
        region: this.primaryRegion,
      }
      this.variables = {}

      this.addDefaultTags(props.tagPrefix)
    } catch (error) {
      this.logError(
        `==> CDK App-Config File is empty or invalid, 
            set up your environment variable(Usage: export ${props.appConfigEnvVarName}=config/app-config-xxx.json) 
            or append inline-argument(Usage: cdk list --context ${props.appConfigEnvVarName}=config/app-config-xxx.json)`
      )
      throw error
    }
  }

  public ready(): boolean {
    return this.env ? true : false
  }

  protected createCommonCoerce(configVersion: string): ICommonCoerce {
    if (configVersion === "1") {
      return new CommonCoerce()
    } else {
      return new CommonCoerceV2()
    }
  }

  /**
   * Get selected stage from CDK context
   */

  private getStageFromCdkContext(): string | undefined {
    return this.cdkApp.node.tryGetContext("STAGE")
  }

  /*
   * Find out the path of app config file
   */

  private getAppConfigPath(params: {
    /** Environment variable where to find config path (e.g. APP_CONFIG) */
    appConfigEnvVarName?: string
    /** Direct input of app config path with ${STAGE} replacement */
    appConfigFilePattern?: string
    /** Stage name used for file pattern ${STAGE} */
    stageForAppConfig?: string
  }): {
    /** Path of app configuration */
    appConfigPath: string
    /** Source of appConfigPath */
    appConfigSource: AppConfigSource
  } {
    const { appConfigEnvVarName, appConfigFilePattern, stageForAppConfig } =
      params

    let appConfigSource: AppConfigSource | undefined
    let appConfigPath: string | undefined

    /**
     * From CDK context (e.g. cdk --context APP_CONFIG=infra/config/app-config.json)
     */

    if (appConfigEnvVarName) {
      appConfigPath = this.cdkApp.node.tryGetContext(appConfigEnvVarName)
      appConfigSource = "Inline-Argument"
    }

    /**
     * From environment variable (e.g. env APP_CONFIG=infra/config/app-config.json)
     */

    if (!appConfigPath && appConfigEnvVarName) {
      appConfigPath = process.env[appConfigEnvVarName]
      appConfigSource = "Environment-Variable"
    }

    /**
     * Based on pattern (e.g. infra/config/app-config-${STAGE}.json)
     */

    if (!appConfigPath && appConfigFilePattern && stageForAppConfig) {
      appConfigSource = "Stage-Variable"
      appConfigPath = appConfigFilePattern.replace(
        "${STAGE}",
        stageForAppConfig
      )
    }

    if (appConfigPath && appConfigSource) {
      this.logInfo(
        `==> CDK App-Config File is ${appConfigPath}, which is from ${appConfigSource}.`
      )
      return { appConfigPath, appConfigSource }
    } else {
      throw new Error("Failed to find App-Config json file")
    }
  }

  private getProjectPrefix(appConfig: AppConfig): string {
    return appConfig.project.name
  }

  /**
   * Update config parameters based substitutions defined in CDK context.
   *
   * @example
   * ```ts
   * // Run CDK CLI with context:
   * // cdk deploy --context project.account=055951622116
   * const appContext = new AppContext({ contextArgs: "project.account" })
   * ```
   */

  private updateConfigContextArgs(appConfig: AppConfig, contextArgs: string[]) {
    for (const key of contextArgs) {
      const jsonKeys = key.split(".")
      let oldValue = undefined
      const newValue: string = this.cdkApp.node.tryGetContext(key)

      // Traverse appConfig and search for the key
      if (newValue !== undefined && jsonKeys.length > 0) {
        try {
          oldValue = jsonKeys.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (reducer: any, pointer: string) =>
              // eslint-disable-next-line no-prototype-builtins
              reducer.hasOwnProperty(pointer) ? reducer[pointer] : undefined,
            appConfig
          )
        } catch (e) {
          this.logError(
            `[ERROR] updateContextArgs: This key[${key}] is an undefined value in Json-Config file.\n`,
            e
          )
          throw e
        }

        // Traverse appConfig again and set new value for the key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jsonKeys.reduce((acc: any, pointer: string, count: number) => {
          if (count === jsonKeys.length - 1) {
            acc[pointer] = newValue
          }
          return acc[pointer]
        }, appConfig)

        this.logInfo(
          `[INFO] updateContextArgs: Updated ${key} = ${oldValue}-->${newValue}`
        )
      }
    }
  }

  /**
   * Update config attributes containing ${ENV_VAR} variables
   */

  private updateConfigEnvVars(config: AppConfig) {
    traverseObject(config, (key, value, obj) => {
      if (typeof value === "string") {
        const envVars = findEnvVars(value)
        let newValue = value
        envVars?.forEach((name) => {
          const envValue = process.env[name]
          if (envValue !== undefined) {
            newValue = replaceEnvVar(newValue, name, envValue)
          }
        })
        // eslint-disable-next-line no-param-reassign
        obj[key] = newValue
      }
    })
  }

  /**
   * Update stack names with project name prefixes
   */

  private addPrefixIntoStackName(appConfig: AppConfig, projectPrefix: string) {
    const appVersion = appConfig.project.version
    const stageName = appConfig.project.stage
    for (const key in appConfig.stacks) {
      const stackType = this.validateStackType(appConfig.stacks[key].stackType)
      const stackOriginalName = appConfig.stacks[key].name
      const stackPrefixedName = this.commonCoerce.composeStackName({
        stackName: stackOriginalName,
        stageName,
        projectPrefix,
        appVersion,
        stackType,
      })
      const stack = appConfig.stacks[key]
      stack.name = stackPrefixedName
      stack.shortStackName = stackOriginalName
    }
  }

  /**
   * Validate application configuration and return sanitized version
   */

  private validateAppConfig(
    appConfig: AppConfig,
    options: {
      stageForAppConfig?: string
      appConfigSourceType?: AppConfigSource
    } = {}
  ): AppConfig {
    const { stageForAppConfig, appConfigSourceType } = options

    // eslint-disable-next-line no-param-reassign, prefer-object-spread
    appConfig = Object.assign(
      {
        project: {},
        stacks: {},
        global: {},
      },
      appConfig
    )

    assert(typeof appConfig.project === "object", "app config: invalid project")
    assert(typeof appConfig.stacks === "object", "app config: invalid stacks")
    assert(typeof appConfig.global === "object", "app config: invalid global")

    assert(
      typeof appConfig.project.name === "string",
      "app config: Project.name is missing"
    )
    assert(
      typeof appConfig.project.stage === "string",
      "app config: Project.stage is missing"
    )

    const projectRegions = this.resolveProjectRegions(appConfig.project)
    // eslint-disable-next-line no-param-reassign
    appConfig.project.regions = projectRegions
    // eslint-disable-next-line no-param-reassign
    appConfig.project.region = projectRegions[0]

    /**
     * If app config is selected based on stage then make sure that the stage in app config is matching the selected stage
     */
    if (stageForAppConfig && appConfigSourceType === "Stage-Variable") {
      assert(
        stageForAppConfig === appConfig.project.stage,
        `stage ${stageForAppConfig} is not matching the stage in app config (${appConfig.project.stage})`
      )
    }

    Object.entries(appConfig.stacks).forEach(([stackName, stackConfig]) => {
      assert(
        typeof stackConfig.name === "string",
        `app config: stack.name is missing in ${stackName} stack`
      )
    })

    return appConfig
  }

  public coerceResourceName(name: string) {
    return this.commonCoerce.coerceResourceName(name)
  }

  public composeResourceName(params: ComposeResourceNameParams) {
    return this.commonCoerce.composeResourceName(params)
  }

  public composeStackName(params: ComposeStackNameParams): string {
    return this.commonCoerce.composeStackName(params)
  }

  /**
   * Read app config synchronously from a file
   */

  public static getAppConfigFromFile(appConfigPath: string): AppConfig {
    try {
      return JSON.parse(fs.readFileSync(appConfigPath).toString())
    } catch (error) {
      throw new Error(`Cannot read app config from ${appConfigPath}: ${error}`)
    }
  }

  /**
   * Get stage name from environment variables
   */

  public static getStageFromEnvironment(): string | undefined {
    return process.env.STAGE || process.env.DEFAULT_STAGE
  }

  /**
   * Sanitize and validate stack type
   */

  public validateStackType(stackType: unknown): StackType {
    const validStackTypes: StackType[] = ["VERSIONED", "SHARED", "GLOBAL"]
    const defaultStackType: StackType =
      this.configVersion === "1" ? "VERSIONED" : "SHARED"

    if (stackType === undefined) {
      return defaultStackType // Default value
    }

    if (typeof stackType === "string") {
      const sanitizedStackType = stackType.toUpperCase() as StackType
      if (validStackTypes.includes(sanitizedStackType)) {
        return sanitizedStackType
      }
    }

    throw new AppContextError(
      "Invalid StackType (allowed values VERSIONED | SHARED | GLOBAL)"
    )
  }

  private resolveProjectRegions(project: ProjectConfig): string[] {
    const regionValues: string[] = []

    if (project.regions !== undefined) {
      if (!Array.isArray(project.regions)) {
        throw new AppContextError(
          "app config: Project.regions must be an array of non-empty strings"
        )
      }

      project.regions.forEach((value, index) => {
        if (typeof value !== "string") {
          throw new AppContextError(
            `app config: Project.regions[${index}] must be a string`
          )
        }
        const trimmed = value.trim()
        if (!trimmed) {
          throw new AppContextError(
            `app config: Project.regions[${index}] must not be empty`
          )
        }
        regionValues.push(trimmed)
      })
    }

    if (project.region !== undefined) {
      if (typeof project.region !== "string") {
        throw new AppContextError(
          "app config: Project.region must be a string when specified"
        )
      }

      const trimmed = project.region.trim()
      if (!trimmed) {
        throw new AppContextError(
          "app config: Project.region must not be empty when specified"
        )
      }

      regionValues.unshift(trimmed)
    }

    const uniqueRegions = regionValues.filter(
      (value, index, self) => self.indexOf(value) === index
    )

    if (uniqueRegions.length === 0) {
      throw new AppContextError(
        "app config: Project.regions (or region) must define at least one AWS region"
      )
    }

    return uniqueRegions
  }

  /**
   * Load application configuration
   */

  private loadAppConfig(
    props: AppContextProps,
    stageForAppConfig?: string
  ): {
    config: AppConfig
    appConfigPath: string
    appConfigSource: AppConfigSource
  } {
    if (props.appConfig) {
      return {
        config: props.appConfig,
        appConfigPath: "",
        appConfigSource: "JSON-Object",
      }
    } else {
      /*
       * Find out the path of app config file
       */
      const { appConfigEnvVarName, appConfigFilePattern } = props
      const { appConfigPath, appConfigSource } = this.getAppConfigPath({
        appConfigEnvVarName,
        appConfigFilePattern,
        stageForAppConfig,
      })

      const config = AppContext.getAppConfigFromFile(appConfigPath)
      return { config, appConfigPath, appConfigSource }
    }
  }

  /**
   * Process application configuration, make value substitutions and update stack names
   */

  private processAppConfig(
    appConfig: AppConfig,
    contextArgs?: string[]
  ): AppConfig {
    // Prevent modifying the input value
    const config = deepCopyJSON(appConfig)

    if (contextArgs !== undefined) {
      // This modifies the appConfig directly in place
      this.updateConfigContextArgs(config, contextArgs)
    }

    // This modifies the appConfig directly in place
    this.updateConfigEnvVars(config)

    const projectPrefix = this.getProjectPrefix(config)

    // This modifies the appConfig directly in place
    this.addPrefixIntoStackName(config, projectPrefix)

    return config
  }

  /**
   * Log information to console
   */
  private logInfo(...args: unknown[]) {
    if (this.enableOutput) {
      // eslint-disable-next-line no-console
      console.info(...args)
    }
  }

  /**
   * Log error to console
   */
  private logError(...args: unknown[]) {
    if (this.enableOutput) {
      // eslint-disable-next-line no-console
      console.error(...args)
    }
  }

  private validateConfigVersion(version: string): string {
    if (AppContext.validConfigVersions.includes(version)) {
      return version
    } else {
      throw new Error(
        `Invalid config version, expected one of ${AppContext.validConfigVersions.join(
          ", "
        )}`
      )
    }
  }

  private addDefaultTags(tagPrefix = "") {
    const tags = cdk.Tags.of(this.cdkApp)
    tags.add(tagPrefix + "project", this.projectName)
    tags.add(tagPrefix + "stage", this.stageName)
    tags.add(
      tagPrefix + "project-stage",
      `${this.projectName}-${this.stageName}`
    )
  }

  public static fromConfig(appConfig: AppConfig): AppContext {
    return new AppContext({
      appConfig,
    })
  }
}

/**
 * Type of source for determining app configuration file
 */

type AppConfigSource =
  | "Inline-Argument"
  | "Environment-Variable"
  | "Stage-Variable"
  | "JSON-Object"
