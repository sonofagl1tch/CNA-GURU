# API Reference

This document provides detailed API documentation for the Security Advisory Assistant components.

## CDK Stack (`code/code_stack.py`)

The `CodeStack` class deploys all AWS infrastructure.

```python
class CodeStack(Stack):
    """
    Main CDK stack for Security Advisory Assistant.
    
    Deploys a complete serverless architecture including VPC, ECS Fargate,
    Lambda functions, OpenSearch Serverless, Bedrock Agent, and Knowledge Base.
    
    Attributes:
        source_ip_parameter: CfnParameter for configurable security group access
        timestamp: str - Unique timestamp for resource naming
        lambda_runtime: lambda_.Runtime - Python 3.12 runtime
        invoke_lambda: lambda_.Function - Lambda for agent invocation
        create_index_lambda: lambda_.Function - Lambda for OpenSearch index creation
    """
    
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        """
        Initialize the CDK stack.
        
        Args:
            scope: CDK construct scope
            construct_id: Unique identifier for the stack
            **kwargs: Additional stack properties
        """
```

### Stack Methods

```python
def get_config(self) -> dict:
    """
    Load configuration from cdk.json context.
    
    Returns:
        dict: Configuration dictionary with paths, names, models, and instructions
    """

def create_kms_key(self) -> kms.Key:
    """
    Create KMS key for encryption with key rotation enabled.
    
    Returns:
        kms.Key: KMS key configured for S3 and CloudWatch Logs encryption
    """

def create_data_source_bucket(self, kms_key: kms.Key) -> Tuple[s3.Bucket, s3.Bucket]:
    """
    Create S3 buckets for agent assets and Athena data.
    
    Args:
        kms_key: KMS key for bucket encryption
        
    Returns:
        Tuple[s3.Bucket, s3.Bucket]: (agent_assets_bucket, athena_bucket)
    """

def upload_files_to_s3(
    self, 
    agent_assets_bucket: s3.Bucket, 
    athena_bucket: s3.Bucket, 
    kms_key: kms.Key
) -> None:
    """
    Upload knowledge base documents, Athena data, and API schemas to S3.
    
    Args:
        agent_assets_bucket: Bucket for knowledge base and API schemas
        athena_bucket: Bucket for Athena/Glue data
        kms_key: KMS key for encryption
    """

def create_glue_database(
    self, 
    athena_bucket: s3.Bucket, 
    kms_key: kms.Key
) -> Tuple[glue.CfnDatabase, glue.CfnCrawler]:
    """
    Create Glue database and crawler for text-to-SQL queries.
    
    Args:
        athena_bucket: S3 bucket containing data files
        kms_key: KMS key for Glue encryption
        
    Returns:
        Tuple[glue.CfnDatabase, glue.CfnCrawler]: Database and crawler resources
    """

def create_lambda_layer(self, layer_name: str) -> PythonLayerVersion:
    """
    Create Lambda layer with Python dependencies.
    
    Args:
        layer_name: Name of the layer (e.g., 'boto3_layer', 'opensearch_layer')
        
    Returns:
        PythonLayerVersion: Lambda layer with ARM64 architecture
    """

def create_lambda_function(
    self,
    agent_assets_bucket: s3.Bucket,
    athena_bucket: s3.Bucket,
    kms_key: kms.Key,
    glue_database: glue.CfnDatabase,
    logging_context: dict
) -> lambda_.Function:
    """
    Create the action Lambda function for Bedrock Agent.
    
    Args:
        agent_assets_bucket: S3 bucket for agent assets
        athena_bucket: S3 bucket for Athena queries
        kms_key: KMS key for environment encryption
        glue_database: Glue database reference
        logging_context: Logging configuration
        
    Returns:
        lambda_.Function: Container-based Lambda function
    """

def create_agent_execution_role(self, agent_assets_bucket: s3.Bucket) -> iam.Role:
    """
    Create IAM role for Bedrock Agent execution.
    
    Args:
        agent_assets_bucket: S3 bucket the agent needs access to
        
    Returns:
        iam.Role: Role with Bedrock and S3 permissions
    """

def create_opensearch_index(
    self, 
    agent_resource_role: iam.Role, 
    opensearch_layer: PythonLayerVersion
) -> Tuple[opensearchserverless.CfnCollection, str, str, CustomResource]:
    """
    Create OpenSearch Serverless collection and vector index.
    
    Args:
        agent_resource_role: IAM role for OpenSearch access
        opensearch_layer: Lambda layer with opensearch-py
        
    Returns:
        Tuple containing:
            - cfn_collection: OpenSearch Serverless collection
            - vector_field_name: Name of the vector field
            - vector_index_name: Name of the vector index
            - lambda_cr: Custom resource for index creation
    """

def create_bedrock_agent(
    self,
    agent_executor_lambda: lambda_.Function,
    agent_assets_bucket: s3.Bucket,
    boto3_layer: PythonLayerVersion,
    agent_resource_role: iam.Role,
    cfn_collection: opensearchserverless.CfnCollection,
    vector_field_name: str,
    vector_index_name: str,
    lambda_cr: CustomResource
) -> Tuple[BedrockKnowledgeBase, BedrockAgent, lambda_.Function, str]:
    """
    Create Bedrock Agent with Knowledge Base and action groups.
    
    Args:
        agent_executor_lambda: Lambda for action group execution
        agent_assets_bucket: S3 bucket with API schema
        boto3_layer: Lambda layer with boto3
        agent_resource_role: IAM role for agent
        cfn_collection: OpenSearch collection
        vector_field_name: Vector field name
        vector_index_name: Vector index name
        lambda_cr: Index creation custom resource
        
    Returns:
        Tuple containing:
            - knowledge_base: BedrockKnowledgeBase instance
            - agent: BedrockAgent instance
            - invoke_lambda: Lambda for invoking the agent
            - agent_resource_role_arn: ARN of the agent role
    """

def create_update_lambda(
    self,
    glue_crawler: glue.CfnCrawler,
    knowledge_base: BedrockKnowledgeBase,
    bedrock_agent: BedrockAgent,
    agent_resource_role_arn: str,
    boto3_layer: PythonLayerVersion
) -> lambda_.Function:
    """
    Create Lambda for post-deployment updates (crawler, sync, alias).
    
    Args:
        glue_crawler: Glue crawler to trigger
        knowledge_base: Knowledge base to sync
        bedrock_agent: Agent to prepare and alias
        agent_resource_role_arn: Agent role ARN
        boto3_layer: Lambda layer with boto3
        
    Returns:
        lambda_.Function: Update Lambda function
    """

def create_streamlit_app(
    self, 
    logging_context: dict, 
    agent: BedrockAgent, 
    invoke_lambda: lambda_.Function
) -> ecs_patterns.ApplicationLoadBalancedFargateService:
    """
    Create ECS Fargate service for Streamlit web UI.
    
    Args:
        logging_context: Logging configuration
        agent: Bedrock Agent for environment variables
        invoke_lambda: Lambda function to invoke
        
    Returns:
        ApplicationLoadBalancedFargateService: Fargate service with ALB
    """
```

## Invoke Lambda (`code/lambdas/invoke-lambda/index.py`)

Handles agent invocation requests from the Streamlit application.

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler with security controls.
    
    Args:
        event: Lambda event with structure:
            {
                "body": {
                    "query": str,      # User's question
                    "session_id": str  # Session identifier
                }
            }
        context: Lambda context object
        
    Returns:
        Dict with structure:
            {
                "answer": str,   # Agent's response text
                "source": str    # Formatted source references
            }
        Or on error:
            {
                "error": str,
                "status": int,
                "details": str
            }
    """

@rate_limit(max_calls=MAX_CALLS_PER_MINUTE, time_window=60)
@error_handler
@audit_log
def invoke_agent(user_input: str, session_id: str) -> Dict[str, Any]:
    """
    Get response from Bedrock Agent with security controls.
    
    Args:
        user_input: User's sanitized question
        session_id: Session identifier for rate limiting
        
    Returns:
        Dict: Streaming response from bedrock-agent-runtime
        
    Raises:
        ValueError: If input is invalid or no agent alias found
        Exception: If rate limit exceeded
    """

def get_agent_response(response: Dict[str, Any]) -> Tuple[str, str, List[str]]:
    """
    Process streaming agent response into text and citations.
    
    Args:
        response: Raw response from invoke_agent containing 'completion' stream
        
    Returns:
        Tuple containing:
            - chunk_text: str - Concatenated response text
            - reference_text: str - Reference content from citations
            - source_file_list: List[str] - S3 URIs or SQL queries
            
    Raises:
        ValueError: If no completion found in response
    """

def get_highest_agent_version_alias_id(response: Dict[str, Any]) -> Optional[str]:
    """
    Find the newest agent alias ID from list_agent_aliases response.
    
    Args:
        response: Response from agent_client.list_agent_aliases()
        
    Returns:
        Optional[str]: Agent alias ID or None if not found
    """

def source_link(input_source_list: List[str]) -> str:
    """
    Process S3 source URIs into formatted markdown references.
    
    Args:
        input_source_list: List of S3 URIs (s3://bucket/key)
        
    Returns:
        str: Formatted markdown string with numbered references
    """

def extract_sql_query(input_string: str) -> Optional[str]:
    """
    Extract and validate SQL query from action group output.
    
    Args:
        input_string: String containing SQL query
        
    Returns:
        Optional[str]: Validated SQL query or None
    """
```

## Action Lambda (`code/lambdas/action-lambda/index.py`)

Processes Bedrock Agent action group requests.

```python
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler with error handling.
    
    Args:
        event: Bedrock Agent action group event
        context: Lambda context object
        
    Returns:
        Dict with structure:
            {
                "messageVersion": "1.0",
                "response": {
                    "actionGroup": str,
                    "apiPath": str,
                    "httpMethod": str,
                    "httpStatusCode": int,
                    "responseBody": {...}
                }
            }
    """

@error_handler
@audit_log
@validate_input
def get_response(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Get response from RAG or Query engine with security controls.
    
    Args:
        event: Action group event with structure:
            {
                "apiPath": str,        # "/uc1" or "/uc2"
                "parameters": [{"value": str}],
                "actionGroup": str,
                "httpMethod": str
            }
        context: Lambda context object
        
    Returns:
        Dict: Formatted action group response
        
    API Paths:
        /uc1: Knowledge base document retrieval
        /uc2: SQL query generation via text-to-SQL engine
    """
```

## Security Module (`code/security/`)

### SecurityConfig (`code/security/security_config.py`)

```python
class SecurityConfig:
    """
    Security configuration settings.
    
    Attributes:
        MAX_INPUT_LENGTH: int - Maximum allowed input length (default: 1000)
        ALLOWED_CHARS_PATTERN: str - Regex pattern for allowed characters
        SESSION_TIMEOUT: int - Session timeout in seconds (default: 3600)
        MAX_RETRIES: int - Maximum retry attempts (default: 3)
        SECURE_HEADERS: Dict[str, str] - HTTP security headers
        ALLOWED_SQL_KEYWORDS: Set[str] - Whitelist of SQL keywords
    """

class InputValidator:
    """Input validation utilities."""
    
    @staticmethod
    def sanitize_input(user_input: str) -> Optional[str]:
        """
        Sanitize user input by validating length and characters.
        
        Args:
            user_input: The input string to sanitize
            
        Returns:
            Optional[str]: Sanitized string or None if invalid
        """
    
    @staticmethod
    def validate_sql_query(query: str) -> bool:
        """
        Validate SQL query against allowed keywords and patterns.
        
        Args:
            query: The SQL query to validate
            
        Returns:
            bool: True if valid, False otherwise
        """

class SessionManager:
    """Secure session management."""
    
    def create_session(self) -> str:
        """
        Create a new secure session with cryptographic token.
        
        Returns:
            str: New session ID (32-byte URL-safe token)
        """
    
    def validate_session(self, session_id: str) -> bool:
        """
        Validate session ID and update last accessed time.
        
        Args:
            session_id: The session ID to validate
            
        Returns:
            bool: True if valid and not expired, False otherwise
        """
    
    def end_session(self, session_id: str) -> None:
        """
        End a session by removing it from storage.
        
        Args:
            session_id: The session ID to end
        """

def safe_log(message: str, sensitive: bool = False) -> None:
    """
    Safely log messages, handling sensitive data appropriately.
    
    Args:
        message: The message to log
        sensitive: If True, only logs in DEBUG mode
    """
```

### Middleware Decorators (`code/security/middleware.py`)

```python
def validate_input(func: Callable) -> Callable:
    """
    Decorator to validate and sanitize input parameters.
    
    Validates the first positional argument using InputValidator.sanitize_input().
    
    Raises:
        ValueError: If input validation fails
    """

def validate_sql(func: Callable) -> Callable:
    """
    Decorator to validate SQL queries.
    
    Validates the first positional argument using InputValidator.validate_sql_query().
    
    Raises:
        ValueError: If SQL validation fails
    """

def error_handler(func: Callable) -> Callable:
    """
    Decorator to handle errors securely without exposing internals.
    
    Returns:
        {"error": "Invalid input", "status": 400} for ValueError
        {"error": "An internal error occurred", "status": 500} for other exceptions
    """

def audit_log(func: Callable) -> Callable:
    """
    Decorator to add audit logging for compliance.
    
    Logs function calls and completions using safe_log().
    """

def rate_limit(max_calls: int, time_window: int) -> Callable:
    """
    Decorator to implement rate limiting per session.
    
    Args:
        max_calls: Maximum number of calls allowed in time window
        time_window: Time window in seconds
        
    Raises:
        Exception: If rate limit exceeded
    """

def secure_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """
    Add security headers to response headers.
    
    Args:
        headers: Original headers dictionary
        
    Returns:
        Dict[str, str]: Headers merged with SecurityConfig.SECURE_HEADERS
    """
```

## Streamlit App (`code/streamlit-app/app.py`)

```python
@error_handler
@rate_limit(max_calls=60, time_window=60)
@validate_input
def get_response(user_input: str, session_id: str) -> Dict[str, Any]:
    """
    Get response from Lambda with security controls.
    
    Args:
        user_input: User's sanitized question
        session_id: Session identifier
        
    Returns:
        Dict: Lambda response with 'answer' and 'source' keys
    """

def header() -> None:
    """Configure secure app header with security meta tags."""

def initialization() -> None:
    """Initialize secure session state with SessionManager."""

def show_message() -> None:
    """Display chat messages with session validation and error handling."""

def main() -> None:
    """Run Streamlit app with security controls."""
```

## Update Lambda (`code/lambdas/update-lambda/lambda_handler.py`)

```python
def lambda_handler(event: dict, context: Any) -> Dict[str, Any]:
    """
    CloudFormation custom resource handler for post-deployment tasks.
    
    Args:
        event: CloudFormation event with RequestType
        context: Lambda context
        
    Returns:
        Dict with statusCode and body
        
    On Create:
        1. Triggers Glue Crawler
        2. Triggers Knowledge Base data source sync
        3. Prepares Bedrock Agent
        4. Creates Agent Alias
        5. Optionally updates Agent prompts
        
    On Delete:
        1. Deletes all Agent aliases
        2. Deletes the Agent
    """
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
