// IMPORTANT: Only use node: prefixed imports for Node.js built-ins
import { exec } from "node:child_process";

interface ToolContext {
  readonly fs: typeof import("node:fs");
  readonly path: typeof import("node:path");
  readonly os: typeof import("node:os");
  readonly process: typeof import("node:process");
  readonly httpClient: {
    request<TInput = unknown, TOutput = unknown>(
      url: URL,
      method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD",
      options?: {
        timeout?: number;
        retryStrategy?: { maxAttempts: number; maxElapsedTime: number };
        body?: TInput;
        headers?: Record<string, string>;
        compression?: "gzip" | "br";
        doNotParse?: TOutput extends Buffer ? boolean : never;
      }
    ): Promise<{
      statusCode: number;
      headers: Record<string, string | string[] | undefined>;
      body: TOutput
    }>;
  };
  readonly rootDir: string;
  readonly validFileGlobs: string[];
  readonly excludedFileGlobs: string[];
  readonly bedrock: {
    prompt(promptParams: {
      inputs: BedrockMessage[];
      system?: { text: string }[];
      inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
        topP?: number;
      };
    }): Promise<{
      stopReason?: string;
      tokensUsed?: number;
      messages: BedrockMessage[];
    }>;
  }
}

type BedrockMessage = {
  role: "user" | "assistant" | string;
  content: Array<{
    text?: string;
    document?: {
      name: string;
      content: string;
    };
    toolUse?: {
      name: string;
      input: string;
    };
    toolResult?: {
      name: string;
      status: "success" | "error";
      content: Array<{
        text?: string;
        document?: {
          name: string;
          content: string;
        };
      }>;
    };
  }>;
};

interface LambdaInvokerParams {
  functionPath: string;
  event?: string | Record<string, unknown>;
  environment?: Record<string, string>;
  timeout?: number;
}

class LambdaInvoker {
  constructor(private readonly context: ToolContext) {}

  public readonly name = "LambdaInvoker";

  public readonly inputSchema = {
    json: {
      type: "object",
      properties: {
        functionPath: {
          type: "string",
          description: "Path to the Lambda function code directory"
        },
        event: {
          oneOf: [
            { type: "string" },
            { type: "object" }
          ],
          description: "Event payload to pass to the Lambda function"
        },
        environment: {
          type: "object",
          description: "Environment variables to set for the Lambda function",
          additionalProperties: {
            type: "string"
          }
        },
        timeout: {
          type: "number",
          description: "Function timeout in seconds (default: 30)"
        }
      },
      required: ["functionPath"],
      additionalProperties: false
    }
  } as const;

  public readonly description =
    "Executes AWS Lambda functions locally for testing";

  public async execute(params: LambdaInvokerParams) {
    const {
      functionPath,
      event = {},
      environment = {},
      timeout = 30
    } = params;

    // Validate function path exists
    if (!this.context.fs.existsSync(functionPath)) {
      throw new Error(`Function path does not exist: ${functionPath}`);
    }

    // Validate handler file exists
    const handlerPath = this.context.path.join(functionPath, "index.py");
    if (!this.context.fs.existsSync(handlerPath)) {
      throw new Error(`Handler file not found: ${handlerPath}`);
    }

    // Create temporary event file
    const eventJson = typeof event === "string" ? event : JSON.stringify(event);
    const eventPath = this.context.path.join(
      this.context.os.tmpdir(),
      `event-${Date.now()}.json`
    );
    this.context.fs.writeFileSync(eventPath, eventJson);

    // Build Python command to invoke handler
    const envVars = Object.entries(environment)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");

    const command = `
      ${envVars} PYTHONPATH=${functionPath} python -c "
import json
import index
import sys
import traceback

with open('${eventPath}', 'r') as f:
    event = json.load(f)

try:
    context = type('Context', (), {
        'function_name': 'local',
        'function_version': '\$LATEST',
        'invoked_function_arn': 'local',
        'memory_limit_in_mb': 128,
        'aws_request_id': 'local',
        'log_group_name': 'local',
        'log_stream_name': 'local',
        'identity': None,
        'client_context': None,
        'get_remaining_time_in_millis': lambda: ${timeout * 1000}
    })()

    result = index.handler(event, context)
    print('SUCCESS:', json.dumps(result))
    sys.exit(0)
except Exception as e:
    print('ERROR:', str(e))
    print('TRACEBACK:', traceback.format_exc())
    sys.exit(1)
"`.trim();

    return new Promise((resolve) => {
      exec(command, { cwd: this.context.rootDir }, (error, stdout, stderr) => {
        // Clean up event file
        try {
          this.context.fs.unlinkSync(eventPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (error) {
          resolve({
            status: "error",
            message: "Error executing Lambda function:",
            error: error.message,
            stdout,
            stderr
          });
        } else {
          const successMatch = stdout.match(/SUCCESS: (.+)$/m);
          if (successMatch) {
            try {
              const result = JSON.parse(successMatch[1]);
              resolve({
                status: "success",
                message: "Lambda function executed successfully:",
                result,
                logs: stdout.split("\n").filter(line => !line.startsWith("SUCCESS:"))
              });
            } catch (e) {
              resolve({
                status: "error",
                message: "Error parsing Lambda function result:",
                error: e.message,
                stdout
              });
            }
          } else {
            resolve({
              status: "error",
              message: "Lambda function did not return a result",
              stdout
            });
          }
        }
      });
    });
  }
}

export default LambdaInvoker;
