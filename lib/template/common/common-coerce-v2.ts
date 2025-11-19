/**
 * Enforce rules for resource names, etc...
 */

import { CommonCoerce } from "./common-coerce"

export class CommonCoerceV2 extends CommonCoerce {
  /**
   * List of resource types which are not added into resource name
   */

  getMutedResourceTypes() {
    return []
  }
}
