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

interface CDKDeploymentParams {
  command: "synth" | "diff" | "deploy" | "destroy";
  stack?: string;
  context?: Record<string, string>;
  requireApproval?: boolean;
}

class CDKDeployment {
  constructor(private readonly context: ToolContext) {}

  public readonly name = "CDKDeployment";

  public readonly inputSchema = {
    json: {
      type: "object",
      properties: {
        command: {
          type: "string",
          enum: ["synth", "diff", "deploy", "destroy"],
          description: "The CDK command to execute"
        },
        stack: {
          type: "string",
          description: "Optional stack name to target specific stack"
        },
        context: {
          type: "object",
          description: "Optional context parameters for CDK command",
          additionalProperties: {
            type: "string"
          }
        },
        requireApproval: {
          type: "boolean",
          description: "Whether to require approval for deployment changes (default: true)"
        }
      },
      required: ["command"],
      additionalProperties: false
    }
  } as const;

  public readonly description =
    "Executes AWS CDK commands for infrastructure deployment and management";

  public async execute(params: CDKDeploymentParams) {
    const {
      command,
      stack,
      context = {},
      requireApproval = true
    } = params;

    // Validate cdk.json exists
    if (!this.context.fs.existsSync("cdk.json")) {
      throw new Error("No cdk.json found in workspace root");
    }

    // Build CDK command
    let cdkCommand = `npx cdk ${command}`;

    if (stack) {
      cdkCommand += ` ${stack}`;
    }

    // Add context parameters
    Object.entries(context).forEach(([key, value]) => {
      cdkCommand += ` -c ${key}=${value}`;
    });

    // Add approval flag for deploy/destroy
    if ((command === "deploy" || command === "destroy") && !requireApproval) {
      cdkCommand += " --require-approval never";
    }

    return new Promise((resolve) => {
      exec(cdkCommand, { cwd: this.context.rootDir }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            status: "error",
            message: `Error executing CDK ${command}:`,
            error: error.message,
            stdout,
            stderr
          });
        } else {
          resolve({
            status: "success",
            message: `CDK ${command} executed successfully:`,
            output: stdout,
            changes: this.parseChanges(stdout)
          });
        }
      });
    });
  }

  private parseChanges(output: string): object | undefined {
    // Extract resource changes from CDK output
    const resourcePattern = /^[+\-~].+?\s+\|\s+.+$/gm;
    const changes = output.match(resourcePattern);

    if (changes) {
      return {
        resourceChanges: changes.map(change => ({
          type: change[0],
          resource: change.split("|")[0].trim().slice(2),
          details: change.split("|")[1].trim()
        }))
      };
    }

    return undefined;
  }
}

export default CDKDeployment;
