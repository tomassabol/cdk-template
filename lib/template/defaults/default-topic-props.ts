import * as sns from "aws-cdk-lib/aws-sns"
import { Construct } from "constructs"
import { resourceName } from "../common/common-utils"
import { withDefaultOptionalPropsFactory } from "./with-default-props-factory"

/**
 * Create default props for SNS Topic.
 *
 * @example
 * ```typescript
 * const topic = new sns.Topic(
 *   this, id, defaultTopicProps(this, id, { ... }))
 * )
 * ```
 */

export const defaultTopicProps = (
  scope: Construct,
  id: string,
  props?: Partial<sns.TopicProps>
): Partial<sns.TopicProps> => {
  const topicName = resourceName(scope, id, "topic")

  return {
    topicName,
    ...props,
  }
}

/**
 * Create args with default props for SNS Topic.
 * Syntactic sugar for defaultTopicProps.
 *
 * Default props:
 *
 * - topicName: standardized name
 *
 * @example
 * ```typescript
 * const topic = new sns.Topic(...withDefaultTopicProps(this, id, { ... } ))
 * )
 * ```
 */

export const withDefaultTopicProps =
  withDefaultOptionalPropsFactory(defaultTopicProps)
