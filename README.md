# Security Advisory Assistant

An AI-powered chatbot that helps security analysts with Common CNA tasks including CWE assignment, CVSS scoring, and vulnerability analysis using Amazon Bedrock.

## Overview

This application leverages Amazon Bedrock with Knowledge Bases and Agents to provide intelligent assistance for security vulnerability analysis. Given a vulnerability description, the assistant can recommend appropriate CWE classifications with supporting reasoning based on FIRST guidance and CWE documentation.

## Architecture

The solution uses a serverless architecture built with AWS CDK. The diagram below shows how a user's question flows through the system to generate an AI-powered response.

![Architecture Diagram](./assets/diagrams/architecture_new.png)

| Color            | Component        | Description                                                          |
| ---------------- | ---------------- | -------------------------------------------------------------------- |
| 🟢 Green (User)  | Security Analyst | You! The person asking questions about vulnerabilities               |
| 🔵 Blue          | Web Interface    | The website you interact with (Load Balancer + Streamlit App)        |
| 🟠 Orange        | Processing       | AWS Lambda functions that coordinate requests                        |
| 🟣 Purple        | AI Engine        | Amazon Bedrock - the "brain" that understands and answers questions  |
| 🟢 Green (Data)  | Data Storage     | CWE documents and vector search index                                |

**How it works:** You ask a question → the web app sends it to the AI engine → the AI searches the knowledge base and generates a response → you get an expert-level CWE recommendation with reasoning.

## Quick Start

### Prerequisites

- Python 3.11+
- Docker
- AWS CDK 2.114.1+
- AWS account with Bedrock access (Claude and Titan models enabled)

### Deployment

1. Create and activate virtual environment:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment (create `code/streamlit-app/.env`):

   ```env
   ACCOUNT_ID=<your-account-id>
   AWS_REGION=<your-region>
   LAMBDA_FUNCTION_NAME=invokeAgentLambda
   ```

4. Deploy:

   ```bash
   cdk bootstrap  # first time only
   cdk deploy
   ```

Initial deployment takes 30-45 minutes. Access the chatbot via the URL in CloudFormation outputs.

### Cleanup

```bash
cdk destroy
```

Note: Manually delete any S3 buckets created by the stack.

## Project Structure

```text
security-advisory-assistant/
├── code/
│   ├── code_stack.py              # Main CDK stack definition
│   ├── lambdas/
│   │   ├── action-lambda/         # Bedrock Agent action handler
│   │   ├── create-index-lambda/   # OpenSearch index creation
│   │   ├── invoke-lambda/         # Agent invocation endpoint
│   │   └── update-lambda/         # Post-deployment updates
│   ├── layers/                    # Lambda layers (boto3, opensearch)
│   ├── security/                  # Security middleware and config
│   └── streamlit-app/             # Web UI application
├── assets/
│   ├── agent_api_schema/          # Bedrock Agent API definitions
│   ├── data_query_data_source/    # Structured data for Athena
│   ├── diagrams/                  # Architecture diagrams
│   └── knowledgebase_data_source/ # CWE knowledge base documents
├── configs/                       # Configuration files
├── docs/                          # Extended documentation
└── tests/                         # Unit tests
```

## Documentation

- [API Reference](./docs/API_REFERENCE.md) - Detailed API documentation for all components
- [Architecture Diagrams](./assets/diagrams/) - Visual diagrams of system architecture, data flow, and deployment
- [Original Blog Post](./docs/original_blog_and_readme.md) - Complete project history, examples, and detailed walkthrough
- [Support](./docs/SUPPORT.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## Configuration

Configuration is managed via `cdk.json` under the `context.config` key:

```json
{
  "config": {
    "logging": {
      "lambda_log_level": "INFO",
      "streamlit_log_level": "INFO"
    },
    "paths": {
      "assets_folder_name": "assets",
      "lambdas_source_folder": "code/lambdas",
      "layers_source_folder": "code/layers",
      "athena_data_destination_prefix": "data_query_data_source",
      "athena_table_data_prefix": "ec2_pricing",
      "knowledgebase_destination_prefix": "knowledgebase_data_source",
      "knowledgebase_file_name": "cna_wisdom.zip",
      "agent_schema_destination_prefix": "agent_api_schema",
      "fewshot_examples_path": "dynamic_examples.csv"
    },
    "names": {
      "bedrock_agent_name": "chatbotBedrockAgent-${timestamp}",
      "bedrock_agent_alias": "bedrockAgent",
      "streamlit_lambda_function_name": "invokeAgentLambda"
    },
    "models": {
      "bedrock_agent_foundation_model": "anthropic.claude-3-haiku-20240307-v1:0"
    },
    "bedrock_instructions": {
      "agent_instruction": "...",
      "knowledgebase_instruction": "...",
      "action_group_description": "..."
    }
  }
}
```

## Security Features

- KMS encryption for S3 buckets and CloudWatch logs
- Input validation and sanitization with character whitelisting
- SQL injection prevention with keyword whitelisting
- Rate limiting on agent invocations (configurable, default 60/min)
- Secure session management with cryptographic tokens
- Audit logging for compliance
- HTTP security headers (X-Frame-Options, CSP, HSTS, etc.)
- Configurable security group IP restrictions:

```bash
# Restrict to current IP
cdk deploy --parameters SourceIpAddress=$(curl -s https://checkip.amazonaws.com)/32

# Allow all (default)
cdk deploy
```

## Usage Examples

### Invoking the Agent via Lambda

```python
import boto3
import json

lambda_client = boto3.client('lambda')

response = lambda_client.invoke(
    FunctionName='sec-advis-asst-invokeAgentLambda-<account>-<region>',
    InvocationType='RequestResponse',
    Payload=json.dumps({
        'body': {
            'query': 'What CWE applies to a buffer overflow vulnerability?',
            'session_id': 'unique-session-id'
        }
    })
)

result = json.loads(response['Payload'].read())
print(result['answer'])
print(result['source'])
```

### Using Security Decorators

```python
from code.security.middleware import validate_input, error_handler, rate_limit
from code.security.security_config import safe_log

@error_handler
@rate_limit(max_calls=10, time_window=60)
@validate_input
def process_query(user_input: str, session_id: str) -> dict:
    safe_log(f"Processing query for session: {session_id}")
    # Your logic here
    return {"result": "success"}
```

## Customization

### Adding Custom Knowledge Base Data

1. Place documents in `assets/knowledgebase_data_source/`
2. Update `cdk.json` → `paths.knowledgebase_file_name`
3. Update `bedrock_instructions.knowledgebase_instruction`

### Adding Structured Data for Queries

1. Add CSV/JSON/Parquet to `assets/data_query_data_source/<subfolder>/`
2. Update `cdk.json` → `paths.athena_table_data_prefix`
3. Update `code/lambdas/action-lambda/prompt_templates.py`
4. Add examples to `code/lambdas/action-lambda/dynamic_examples.csv`

## License

MIT-0 License. See [LICENSE](./LICENSE).
