# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.18.2] - 2025-11-28

### Changed

- Added readme
- Added changelog

## [2.18.1] - 2025-11-20

### Changed

- Bump lambda powertools layer

## [2.18.0] - 2025-11-04

### Changed

- Multi region stack deploy

## [2.17.1] - 2025-02-27

### Changed

- Upgrade node for pipeline

## [2.17.0] - 2025-02-27

### Changed

- Upgrade to node22

## [2.16.1] - 2024-12-01

### Fixed

- Fixed IFeatureFlagConfiguration type

## [2.16.0] - 2024-11-30

### Added

- Add FeatureFlagSimplePattern

## [2.15.0] - 2024-08-09

### Changed

- Change Slack webhook for log-it

### Fixed

- Fix test

## [2.14.0] - 2024-06-20

### Removed

- Remove unnecessary steps from devops pipeline

## [2.13.0] - 2024-06-18

### Changed

- Change Slack webhook for SCT

## [2.12.0] - 2024-06-10

### Changed

- Add enable option for sending slack notifications in devops pipelines

## [2.11.0] - 2024-04-08

### Added

- Add Slack notif

## [2.10.0] - 2024-03-19

### Added

- Add Slack notif step to prod pipeline

## [2.9.10] - 2024-02-26

### Added

- Add options to configure default usage plan of RestApiSimplePattern

## [2.9.9] - 2024-02-26

### Changed

- Upgrade powertools layer to version 1.18.1 (using arn:aws:lambda:{region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:29)

## [2.9.8] - 2024-01-29

### Security

- Fix vulnerabilities

## [2.9.7] - 2024-01-29 (DEPRECATED)

## [2.9.6] - 2023-10-11

### Added

- Add default tags to all resources: project, project-stage, stage and stack

## [2.9.5] - 2023-07-04

### Changed

- Remove BaseConstruct dependencies from patterns

## [2.9.4] - 2023-06-19

### Fixed

- Fix autoDeleteObjects property

## [2.9.3] - 2023-06-12

### Changed

- Rename PowertoolsLayer to LambdaPowertoolsLayer to avoid clash with existing projects when upgrading to newer version of @tomassabol/cdk-template
- Updated the powertools layer from version 11 to version 12

## [2.9.2] - 2023-06-08

### Fixed

- Fix optional enabled property in DevopsAppPipelineStack properties

## [2.9.1] - 2023-06-08

### Changed

- Refactor DevopsAppPipelineStack properties

## [2.9.0] - 2023-06-08

### Added

- Add common utilities
- Add version 2 to configuration file
- Add default props for AWS resources
- Add devops application pipeline
- Add devops configuration pipeline

## [2.8.1] - 2023-05-28

### Changed

- Change deprecated prop minimumCompressionSize to minCompressionSize in RestApiSimplePattern
- Update npm modules to latest versions

## [2.8.0] - 2023-05-23

### Changed

- Add fullGitClone source attribute to PipelineSimplePattern

## [2.7.6] - 2023-05-02

### Fixed

- Fix lambda policy for multiple concurrency warm ups

## [2.7.5] - 2023-03-30

### Fixed

- Rename configDirectory to configFolder and fixed default values

## [2.7.4] - 2023-03-30

### Changed

- Rename environmentName to configDirectory

## [2.7.3] - 2023-03-30

### Changed

- Add environmentName parameter for AppConfigSimplePattern

## [2.7.2] - 2023-03-30

### Fixed

- Fix installLatestAwsSdk parameter for custom resource in RestApiSimplePattern

## [2.7.1] - 2023-03-29

### Added

- Export API Gateway URL and API key to SSM parameters in RestApiSimplePattern

## [2.7.0] - 2023-03-11

### Changed

- Improve type control for BaseStack.fromAppContext method

## [2.6.1] - 2023-03-10

### Changed

- Fix naming for simple pipeline imports artifacts attributes

## [2.6.0] - 2023-03-10

### Added

- Add artifacts support for simple pipeline pattern

## [2.4.3] - 2023-03-02

### Added

- Add function grandAppConfigAccess

## [2.4.2] - 2023-03-02

### Changed

- Improve naming for pipelines

## [2.4.1] - 2023-03-02

### Fixed

- Revert tsconfig.json to CommonJS modules

## [2.4.0] - 2023-03-01

### Added

- New pattern AppConfigDeploymentPipelineSimplePattern

## [2.3.1] - 2023-03-01

### Fixed

- Fix missing export of NodeJsFunctionSimplePattern

## [2.3.0] - 2023-03-01

### Changed

- Improved construct RestApiSimplePattern
- Simplified createResourceName
- New pattern NodeJsFunctionSimplePattern
- Deprecated createNodeJsFunction

## [2.2.2] - 2023-01-13

### Fixed

- Fixed build of package files in dist folder (issue in 2.2.0 and 2.2.1)

## [2.2.0] - 2023-01-13

### Changed

- Add access log and CloudWatch Logs to RestApiSimplePattern

### Fixed

- Fix warm up handling

## [2.1.0] - 2023-01-02

### Changed

- Update runtime to version 16 for CodeBuild projects
- Change build image to Amazon Linux 2 x86_64 standard:4.0 for CodeBuild projects
- Add support for installation of SonarQube scanner and GhostScript in CodeBuild projects

## [2.0.3] - 2022-10-22

### Fixed

- Fix integration policy naming in simple Rest API pattern

## [2.0.2] - 2022-10-21

## Changed

- Add environment (account/region) to base stack construct initialization

## [2.0.1] - 2022-10-18

## Added

- Add missing type exports

## [2.0.0] - 2022-10-15

## Changed

- BREAKING CHANGE! Use camelCase in app configuration files
- Default props in AppContext constructor

## [1.2.0] - 2022-10-15

### Added

- Add Rest Api simple pattern

## [1.1.3] - 2022-10-11

### Fixed

- Fix example script deployment-stack
- Export IBaseConstruct and IBaseStack

## [1.1.2] - 2022-10-09

### Added

- Optional artifacts for build project in simple pipeline pattern

### Fixed

- Fix deployment stack in template init

## [1.1.1] - 2022-10-09

### Fixed

- Fix warmup lambda permissions

## [1.1.0] - 2022-10-09

- Add support for lambda warm up

## [1.0.2] - 2022-10-05

### Changed

- Add all bucket props to createS3Bucket guardian

## [1.0.1] - 2022-10-04

### Fixed

- Environment variables in BuildCodeBuild action type in PipelineSimplePattern

## [1.0.0] - 2%22-10-04

### Added

- Initial version
