#!/usr/bin/env node

import { buildJsonOutput, buildPlainText, runAudit } from "./core";

function printUsage(): void {
  console.log(`
@1devstudio/agentlint — Run AgentLint audits in any CI/CD pipeline

Usage:
  npx @1devstudio/agentlint audit --url <url> --api-key <key> [options]

Options:
  --url <url>          URL to audit (required)
  --api-key <key>      AgentLint API key (required, or set AGENTLINT_API_KEY)
  --threshold <n>      Minimum score to pass (default: 0)
  --api-url <url>      API base URL (default: https://agentlint.io)
  --format <fmt>       Output format: text, json, markdown (default: text)
  --help               Show this help

Environment:
  AGENTLINT_API_KEY    API key (alternative to --api-key flag)

Exit codes:
  0    Audit passed (score >= threshold)
  1    Audit failed (score < threshold) or error
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = "true";
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2);
      parsed[key] = args[++i];
    } else if (!parsed._command) {
      parsed._command = arg;
    }
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args._command) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  if (args._command !== "audit") {
    console.error(`Unknown command: ${args._command}`);
    printUsage();
    process.exit(1);
  }

  const url = args.url;
  const apiKey = args["api-key"] || process.env.AGENTLINT_API_KEY;
  const threshold = Number.parseInt(args.threshold || "0", 10);
  const apiUrl = args["api-url"] || "https://agentlint.io";
  const format = args.format || "text";

  if (!url) {
    console.error("Error: --url is required");
    process.exit(1);
  }

  if (!apiKey) {
    console.error(
      "Error: --api-key is required (or set AGENTLINT_API_KEY env var)"
    );
    process.exit(1);
  }

  try {
    console.error(`🔍 Running AgentLint audit on ${url}...`);

    const outcome = await runAudit({ url, apiKey, apiUrl, threshold });

    // Output based on format
    switch (format) {
      case "json":
        console.log(buildJsonOutput(outcome));
        break;
      case "markdown":
        console.log(
          (await import("./core")).buildMarkdown(outcome)
        );
        break;
      default:
        console.log(buildPlainText(outcome));
    }

    if (!outcome.passed) {
      process.exit(1);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ AgentLint error: ${message}`);
    process.exit(1);
  }
}

main();
