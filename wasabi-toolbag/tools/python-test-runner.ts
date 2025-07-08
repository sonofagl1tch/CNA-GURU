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

interface PythonTestRunnerParams {
  testPath?: string;
  pattern?: string;
  parallel?: boolean;
  coverage?: boolean;
  verbose?: boolean;
}

class PythonTestRunner {
  constructor(private readonly context: ToolContext) {}

  public readonly name = "PythonTestRunner";

  public readonly inputSchema = {
    json: {
      type: "object",
      properties: {
        testPath: {
          type: "string",
          description: "Directory or file path containing tests to run (default: tests/)"
        },
        pattern: {
          type: "string",
          description: "Test file pattern to match (e.g., 'test_*.py')"
        },
        parallel: {
          type: "boolean",
          description: "Run tests in parallel using pytest-xdist (default: false)"
        },
        coverage: {
          type: "boolean",
          description: "Generate test coverage report using pytest-cov (default: false)"
        },
        verbose: {
          type: "boolean",
          description: "Show verbose test output (default: false)"
        }
      },
      additionalProperties: false
    }
  } as const;

  public readonly description =
    "Executes Python tests using pytest, with options for parallel execution and coverage reporting";

  public async execute(params: PythonTestRunnerParams) {
    const {
      testPath = "tests",
      pattern,
      parallel = false,
      coverage = false,
      verbose = false
    } = params;

    // Validate test path exists
    if (!this.context.fs.existsSync(testPath)) {
      throw new Error(`Test path does not exist: ${testPath}`);
    }

    // Build pytest command with options
    let command = "python -m pytest";

    if (pattern) {
      command += ` -k "${pattern}"`;
    }

    if (parallel) {
      command += " -n auto";
    }

    if (coverage) {
      command += " --cov --cov-report=term-missing";
    }

    if (verbose) {
      command += " -v";
    }

    command += ` ${testPath}`;

    return new Promise((resolve) => {
      exec(command, { cwd: this.context.rootDir }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            status: "error",
            message: "Error executing tests:",
            error: error.message,
            stdout,
            stderr
          });
        } else {
          resolve({
            status: "success",
            message: "Tests executed successfully:",
            output: stdout,
            coverage: coverage ? this.parseCoverageReport(stdout) : undefined
          });
        }
      });
    });
  }

  private parseCoverageReport(output: string): object | undefined {
    // Extract coverage data from pytest-cov output
    const coverageMatch = output.match(/TOTAL.+?(\d+)%/);
    if (coverageMatch) {
      return {
        totalCoverage: parseInt(coverageMatch[1], 10)
      };
    }
    return undefined;
  }
}

export default PythonTestRunner;
