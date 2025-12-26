# Changelog

All notable changes to the Security Advisory Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Types of Changes

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Now removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes

## [Unreleased]

## [1.4.0] - 2025-12-26

### Added

- Comprehensive architecture and data flow diagrams (Mermaid and PNG formats)
- Visual documentation for deployment flow, Lambda interactions, security model, and user journey
- Archived original README content in `docs/original_blog_and_readme.md`

### Changed

- Refactored README.md for improved clarity and maintainability
- Upgraded action-lambda base image from Python 3.11 to 3.12
- Replaced yum with dnf package manager in action-lambda Dockerfile
- Reorganized Dockerfile USER directives for security best practices
- Moved test files to proper `tests/` package structure

### Security

- Updated llama-index-core to >=0.12.41 (CVE-2024-3098, CVE-2024-3271, CVE-2025-5472)
- Updated sqlalchemy to >=2.0.36 for SQL injection vulnerability fixes
- Updated urllib3 to >=2.2.3 and requests to >=2.32.4
- Updated streamlit to >=1.41.0 (CWE-117 output neutralization fix)
- Updated tornado to >=6.5.0 (CVE-2024-52804, CVE-2025-67724)
- Added certifi >=2024.8.30, aiohttp >=3.10.11, jinja2 >=3.1.5

## [1.3.0] - 2025-12-20

### Security

- Fixed authlib vulnerability
- Fixed urllib3 vulnerabilities
- Fixed tornado vulnerabilities
- Updated all dependencies to latest secure versions

## [1.2.0] - 2025-11-13

### Security

- Updated llama-index-core to >=0.13.0 to fix insecure temporary file handling
- Fixed Denial of Service vulnerability in JSONReader (llama-index-core <0.12.38)

## [1.1.0] - 2025-09-26

### Added

- Security middleware module with rate limiting, input validation, and session management
- Security configuration module for centralized security settings
- Timestamp-based unique Bedrock agent naming for deployment reliability

### Changed

- Updated Streamlit app to use new security dependencies
- Improved error handling in Streamlit application
- Standardized dependency versioning with minimum version constraints

### Fixed

- OpenSearch API compatibility (updated indices.create/delete method calls)
- Code formatting and syntax issues across CDK stack

### Security

- Added rate limiting on agent invocations
- Implemented input validation and sanitization
- Added secure session management with cryptographic tokens

## [1.0.1] - 2025-08-23

### Security

- Updated pillow >=10.2.0 (heap overflow, eval injection, DoS fixes)
- Updated pyarrow >=14.0.1 (deserialization vulnerability)
- Updated protobuf >=4.25.8 (uncontrolled recursion)
- Updated tornado >=6.5 (resource allocation, CRLF injection)
- Updated requests >=2.32.4 (information leakage)
- Updated zipp >=3.19.1 (infinite loop)

## [1.0.0] - 2025-07-08

### Added

- Initial public release of Security Advisory Assistant
- AI-powered chatbot for CWE assignment and CVSS scoring
- Amazon Bedrock integration with Knowledge Bases and Agents
- Serverless architecture using AWS CDK
- Streamlit-based web interface
- OpenSearch vector search for CWE knowledge base
- Athena integration for structured data queries
- EC2 pricing sample data for testing
- Comprehensive security implementation:
  - KMS encryption for S3 and CloudWatch logs
  - Input validation and SQL injection prevention
  - HTTP security headers
  - Configurable security group IP restrictions

### Security

- Fixed LlamaIndex SQL injection vulnerability

## [0.1.0] - 2025-01-03

### Added

- Initial repository setup
- Core CDK infrastructure
- Lambda functions for agent invocation and actions
- Basic Streamlit application
- CWE knowledge base integration

[Unreleased]: https://github.com/awslabs/security-advisory-assistant/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/awslabs/security-advisory-assistant/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/awslabs/security-advisory-assistant/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/awslabs/security-advisory-assistant/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/awslabs/security-advisory-assistant/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/awslabs/security-advisory-assistant/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/awslabs/security-advisory-assistant/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/awslabs/security-advisory-assistant/releases/tag/v0.1.0
