import type {
  Reporter,
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

const REPORT_PATH = "e2e-report.md";

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatStep(step: TestStep, indent = ""): string {
  let out = `${indent}- **${escapeMd(step.title)}**`;
  if (step.error) {
    out += `\n${indent}  ❌ \`${escapeMd(step.error?.message ?? "Unknown error")}\``;
  }
  for (const child of step.steps) {
    out += "\n" + formatStep(child, indent + "  ");
  }
  return out;
}

export default class AIReporter implements Reporter {
  private output: string[] = [];
  private config!: FullConfig;

  onBegin(config: FullConfig, _suite: Suite) {
    this.config = config;
    this.output = [];
    this.output.push("# E2E Test Report — AI Analysis\n");
    this.output.push(`Generated: ${new Date().toISOString()}\n`);
    this.output.push(`Base URL: ${config.projects[0]?.use?.baseURL ?? "N/A"}\n`);
    this.output.push("---\n");
  }

  onTestBegin(_test: TestCase) {
    this.output.push("\n## Test Started\n");
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const statusEmoji = status === "passed" ? "✅" : status === "failed" ? "❌" : "⏭️";

    this.output.push(`### ${statusEmoji} ${escapeMd(test.title)}\n`);
    this.output.push(`**Status:** ${status}\n`);

    if (result.error) {
      this.output.push(`\n**Error:**\n\`\`\`\n${result.error.message}\n\`\`\`\n`);
      if (result.error.stack) {
        this.output.push(`\n**Stack:**\n\`\`\`\n${result.error.stack}\n\`\`\`\n`);
      }
    }

    if (result.steps.length > 0) {
      this.output.push("\n**Steps:**\n");
      for (const step of result.steps) {
        this.output.push(formatStep(step) + "\n");
      }
    }

    if (result.attachments.length > 0) {
      this.output.push("\n**Attachments:**\n");
      for (const a of result.attachments) {
        if (a.path) {
          this.output.push(`- ${a.name}: \`${a.path}\`\n`);
        } else if (a.body && a.name === "e2e-capture") {
          try {
            const bodyStr = Buffer.isBuffer(a.body) ? a.body.toString("utf-8") : String(a.body);
            const data = JSON.parse(bodyStr);
            if (data.consoleEntries?.length) {
              this.output.push("\n**Console errors/warnings:**\n");
              for (const e of data.consoleEntries) {
                this.output.push(`- [${e.type}] ${escapeMd(e.text)}\n`);
              }
            } else if (data.consoleEntries && data.consoleEntries.length === 0) {
              this.output.push("\n**Console:** No errors or warnings.\n");
            }
            if (data.networkFailures?.length) {
              this.output.push("\n**Network failures:**\n");
              for (const n of data.networkFailures) {
                this.output.push(`- ${escapeMd(n.url)}: ${escapeMd(n.failure)}\n`);
              }
            } else if (data.networkFailures && data.networkFailures.length === 0) {
              this.output.push("\n**Network:** No failed requests.\n");
            }
          } catch {
            this.output.push(`- ${a.name}: (binary)\n`);
          }
        }
      }
    }

    this.output.push("\n---\n");
  }

  onEnd(_result: FullResult) {
    this.output.push("\n## Summary\n");
    this.output.push("Review the errors, console output, and network failures above.\n");
    this.output.push("Screenshots and traces are in `test-results/`.\n");

    const outPath = path.resolve(process.cwd(), REPORT_PATH);
    fs.writeFileSync(outPath, this.output.join(""), "utf-8");
    console.log(`\n📄 AI report written to ${outPath}`);
  }
}
