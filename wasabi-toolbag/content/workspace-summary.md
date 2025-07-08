# Workspace Summary

## Overview
This workspace contains a Python-based application that appears to be a chatbot system for helping security teams perform vulnerability assessments. The application is built using AWS serverless technologies and includes both backend Lambda functions and a Streamlit-based web interface.

## Project Structure
```
.
├── app.py                 # Main application entry point
├── code/
│   ├── lambdas/          # AWS Lambda functions
│   │   ├── action-lambda
│   │   ├── create-index-lambda
│   │   ├── invoke-lambda
│   │   └── update-lambda
│   ├── layers/           # AWS Lambda layers
│   │   ├── boto3_layer
│   │   └── opensearch_layer
│   └── streamlit-app/    # Web interface application
├── assets/               # Application assets and data
├── docs/                # Documentation
└── images/              # UI screenshots and diagrams
```

## Technologies

### Programming Languages
- Python (Primary language)

### Key Dependencies
- boto3 (1.28.38) - AWS SDK for Python
- opensearch-py (2.2.0) - OpenSearch Python client
- requests (2.31.0) - HTTP library for Python
- streamlit (1.22.0) - Web application framework

### Infrastructure
- AWS CDK - Infrastructure as Code
- AWS Lambda - Serverless compute
- Amazon OpenSearch - Search and analytics engine

## Development Environment

### Package Management
- pip (Python package manager)
- Requirements files for dependency management
  - Root level requirements.txt
  - Separate requirements.txt files in Lambda and Streamlit app directories

### Build System
- AWS CDK for infrastructure deployment
- Lambda layers for dependency management
- No traditional build system present

### Code Style
No explicit code style enforcement tools are configured. Developers should follow:
- PEP 8 style guide for Python code
- Standard Python naming conventions
- Consistent indentation (spaces preferred over tabs)

### Testing
No testing framework is currently configured. Recommended improvements:
- Add pytest for unit testing
- Implement integration tests for Lambda functions
- Add UI testing for Streamlit application

### Logging and Metrics
Current implementation uses basic print statements for logging. Recommended improvements:
- Implement structured logging using Python's logging module
- Add CloudWatch metrics integration
- Configure proper log levels and formats

## Application Components

### Lambda Functions
- action-lambda: Handles specific actions/operations
- create-index-lambda: Manages index creation
- invoke-lambda: Handles function invocation
- update-lambda: Manages updates

### Web Interface
- Streamlit-based dashboard
- Located in code/streamlit-app/
- Includes visualization components

### Data Sources
- Assets directory contains data files
- Integration with OpenSearch for data storage/retrieval

## Documentation
- README.md provides basic project information
- Additional documentation in docs/ directory
- Architecture diagrams in images/ directory
