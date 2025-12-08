import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch"
import { Construct } from "constructs"
import { resourceName } from "../../common/common-utils"

export type CloudWatchAlarmSimplePatternProps = {
  alarmAction: cloudwatch.IAlarmAction
  defaultAlarmOptions?: Partial<cloudwatch.CreateAlarmOptions>
}

/**
 * Construct to create CloudWatch alarms
 */

export class CloudWatchAlarmSimplePattern extends Construct {
  protected alarmAction: cloudwatch.IAlarmAction
  protected defaultAlarmOptions: cloudwatch.CreateAlarmOptions

  constructor(
    scope: Construct,
    id: string,
    props: CloudWatchAlarmSimplePatternProps
  ) {
    super(scope, id)
    this.alarmAction = props.alarmAction
    this.defaultAlarmOptions = {
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      ...props.defaultAlarmOptions,
    }
  }

  /**
   * Helper to create alarm
   */

  public createAlarm(
    name: string,
    metric: cloudwatch.Metric,
    options: Partial<cloudwatch.CreateAlarmOptions> = {}
  ): this {
    metric
      .createAlarm(this, name, {
        ...this.defaultAlarmOptions,
        ...options,
      })
      .addAlarmAction(this.alarmAction)
    return this
  }
}
