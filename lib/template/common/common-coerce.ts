import { StackType } from "../app-config"

export interface ICommonCoerce {
  /**
   * Coerce resource name into lowercase format like "abc-def-ghi".
   */
  coerceResourceName(name: string): string

  /**
   * Compose resource name into "project-stack-version-stage-name-type" format.
   */
  composeResourceName(params: {
    /** Base name for the resource */
    baseName: string
    /** Stack name in "project-stack-version-stage" format */
    stackName: string
    /** Resource type, e.g. "table" */
    resourceType?: string
  }): string

  /**
   * Compose a stack name into "project-stack-version-stage" format.
   */
  composeStackName(params: {
    /** Base stack name */
    stackName: string
    /** Project prefix, usually same as project name  */
    projectPrefix: string
    /** Name of the stage, e.g. "prod" */
    stageName: string
    /** Application version, e.g. "v2" */
    appVersion?: string
    /** Type of stack */
    stackType: StackType
  }): string
}

/**
 * Enforce rules for resource names, etc...
 */

export class CommonCoerce implements ICommonCoerce {
  /**
   * Coerce resource name into lowercase format like "abc-def-ghi".
   */

  coerceResourceName(name: string): string {
    if (typeof name === "string" && name) {
      const validateRegex = /^[a-zA-Z0-9-]+(-[a-zA-Z0-9-]+)+$/
      const resourceName = name.toLowerCase().replace(/[ _]/g, "-")
      if (validateRegex.test(resourceName)) {
        return resourceName
      }
    }

    throw new Error(
      `Invalid resource name: ${name} (use only alphanumeric characters, spaces and dashes)`
    )
  }

  /**
   * Compose resource name into "project-stack-version-stage-name-type" format.
   */

  composeResourceName(params: ComposeResourceNameParams): string {
    /** List of resource types which are not added into resource name */
    const mutedResourceTypes = this.getMutedResourceTypes()

    const { baseName, stackName, resourceType } = params

    const parts: string[] = []

    parts.push(stackName)
    parts.push(baseName)
    if (resourceType && false === mutedResourceTypes.includes(resourceType)) {
      // Do not add resource type if it is already present in base name
      if (!baseName.match(new RegExp(`-${resourceType}$`, "g"))) {
        parts.push(resourceType)
      }
    }

    return this.coerceResourceName(parts.join("-"))
  }

  /**
   * Compose a stack name into "project-stack-version-stage" format.
   */

  composeStackName(params: ComposeStackNameParams): string {
    const { stackName, projectPrefix, stageName, appVersion, stackType } =
      params

    const parts: string[] = []

    parts.push(projectPrefix)
    parts.push(stackName)
    if (appVersion && stackType === "VERSIONED") {
      parts.push(appVersion)
    }
    if (stageName && (stackType === "VERSIONED" || stackType === "SHARED")) {
      parts.push(stageName)
    }

    return this.coerceResourceName(parts.join("-"))
  }

  /**
   * List of resource types which are not added into resource name
   */

  getMutedResourceTypes() {
    return ["function"]
  }
}

export type ComposeResourceNameParams = {
  /** Base name for the resource */
  baseName: string
  /** Stack name in "project-stack-version-stage" format */
  stackName: string
  /** Resource type, e.g. "table" */
  resourceType?: string
}

export type ComposeStackNameParams = {
  /** Base stack name */
  stackName: string
  /** Project prefix, usually same as project name  */
  projectPrefix: string
  /** Name of the stage, e.g. "prod" */
  stageName: string
  /** Application version, e.g. "v2" */
  appVersion?: string
  /** Type of stack */
  stackType: StackType
}
